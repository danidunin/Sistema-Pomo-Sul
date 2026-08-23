/**
 * Importa o histórico da planilha `Monitoramento_2026-2027.xlsx` para as tabelas
 * PontoMonitoramento / Armadilha / LeituraArmadilha.
 *
 * Uso:
 *   npx tsx --env-file=.env scripts/importar-monitoramento-pragas.ts <caminho.xlsx>
 *   npx tsx --env-file=.env scripts/importar-monitoramento-pragas.ts <caminho.xlsx> --gravar
 *
 * Sem `--gravar` o script NÃO escreve nada no banco: apenas lê a planilha, casa
 * cada coluna de armadilha com um talhão e imprime o relatório de conferência.
 *
 * ATENÇÃO — LIMITE DE IDEMPOTÊNCIA DO `--gravar`:
 * A identidade de um ponto é a unique (propriedadeId, tipoPraga, nome, safra) —
 * ou seja, é o NOME. Reexecutar com `--gravar` só é seguro enquanto nem os nomes
 * dos pontos já importados nem o desenho das colunas "Média" da planilha tiverem
 * mudado. Em particular:
 *   • se alguém renomear um ponto no app, a reexecução não acha o nome antigo e
 *     cria um ponto DUPLICADO, reimportando todas as leituras dele;
 *   • se o produtor renomear um grupo na planilha (linhas 6/7) ou mudar o
 *     conjunto de armadilhas de uma coluna "Média" cujo grupo não tem nome (o
 *     nome passa a ser derivado da primeira armadilha do grupo), o mesmo ocorre.
 * Isto é uma migração de uma vez só, não uma sincronização contínua. Se precisar
 * reimportar depois de renomear, apague antes os pontos importados.
 *
 * Opções:
 *   --gravar          executa a gravação (transação por aba)
 *   --safra=2026/2027 força a safra em vez de ler da linha 1 da aba
 *   --verbose         imprime também as colunas ignoradas (Média/Soma/desativadas)
 *
 * Estrutura real da planilha (conferida em 2026-08-22 no arquivo do produtor):
 *   linha 1  título com a safra ("... - SAFRA 2026/2027")
 *   linha 6  nome da seção de praga (célula mesclada) e, nas colunas de média,
 *            o nome do grupo/ponto (ex.: "SEDE", "FIRMINHA", "Pomo 1")
 *   linha 7  rótulo de cada coluna: armadilhas ("1-Fort/Reub 05"), colunas
 *            calculadas ("Média ...", "Soma 2 leit.") e "Total"
 *   linha 8+ uma linha por data de leitura (coluna 1 = data)
 */
import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import type { TipoPraga } from "@/generated/prisma/enums";

const CAMINHO_PLANILHA = process.argv[2];
const MODO_GRAVAR = process.argv.includes("--gravar");
const MODO_VERBOSE = process.argv.includes("--verbose");
const SAFRA_FORCADA = process.argv.find((a) => a.startsWith("--safra="))?.slice("--safra=".length);

// ---------------------------------------------------------------------------
// Mapeamentos manuais (derivados da inspeção do arquivo real — ver relatório da
// Task 10). Qualquer ajuste aqui muda o que será gravado: revisar com o dono.
// ---------------------------------------------------------------------------

/**
 * A aba da planilha se chama "Pomo Sul", mas a Propriedade cadastrada no banco
 * se chama apenas "Pomo" (conferido em 2026-08-22). Sem este mapa a aba inteira
 * seria pulada. NÃO alterar sem confirmar os nomes reais em `propriedades.nome`.
 */
const PROPRIEDADE_POR_ABA: Record<string, string> = {
  "Pomo Sul": "Pomo",
  Lapinha: "Lapinha",
};

type Secao = {
  /** primeira coluna da seção (linha 7) */
  colunaInicio: number;
  /** última coluna da seção — a seção seguinte começa em colunaFim + 1 */
  colunaFim: number;
  tipoPraga: TipoPraga;
};

/**
 * Seções de praga por aba. As colunas de início vêm das células mescladas da
 * linha 6; o fim de cada seção é a coluna imediatamente anterior ao início da
 * próxima (a linha 7 nunca tem célula vazia entre seções, então não dá para
 * detectar o fim caminhando até achar vazio).
 */
const SECOES_POR_ABA: Record<string, Secao[]> = {
  "Pomo Sul": [
    { colunaInicio: 2, colunaFim: 34, tipoPraga: "GRAPHOLITA_MOLESTA" },
    { colunaInicio: 35, colunaFim: 52, tipoPraga: "MOSCA_DAS_FRUTAS" }, // Caroço
    { colunaInicio: 53, colunaFim: 67, tipoPraga: "MOSCA_DAS_FRUTAS" }, // Eva
    { colunaInicio: 68, colunaFim: 83, tipoPraga: "BONAGOTA" }, // Lagarta Enroladeira
    { colunaInicio: 84, colunaFim: 91, tipoPraga: "CYDIA" },
  ],
  Lapinha: [
    { colunaInicio: 2, colunaFim: 29, tipoPraga: "GRAPHOLITA_MOLESTA" },
    { colunaInicio: 30, colunaFim: 55, tipoPraga: "MOSCA_DAS_FRUTAS" },
    { colunaInicio: 56, colunaFim: 74, tipoPraga: "BONAGOTA" },
    // Seção Cydia (linha 6 = "Cydia", colunas 75-76) ausente do plano original;
    // encontrada na inspeção do arquivo real.
    { colunaInicio: 75, colunaFim: 76, tipoPraga: "CYDIA" },
  ],
};

/**
 * Apelidos manuais de talhão: `"<aba>|<rótulo da linha 7>" -> nomeCodinome`.
 * Deixado vazio de propósito — os rótulos que o casamento automático não
 * resolve são listados no relatório para o dono resolver à mão, em vez de
 * serem adivinhados aqui.
 */
const ALIASES_TALHAO: Record<string, string> = {};

// ---------------------------------------------------------------------------
// Leitura de células
// ---------------------------------------------------------------------------

function desembrulhar(valor: ExcelJS.CellValue): unknown {
  if (valor === null || valor === undefined) return null;
  if (valor instanceof Date) return valor;
  if (typeof valor === "object") {
    if ("result" in valor) return valor.result ?? null;
    if ("richText" in valor) return valor.richText.map((parte) => parte.text).join("");
    if ("text" in valor) return valor.text;
    return null; // célula de erro (#DIV/0!, etc.)
  }
  return valor;
}

function texto(sheet: ExcelJS.Worksheet, linha: number, coluna: number): string {
  const valor = desembrulhar(sheet.getRow(linha).getCell(coluna).value);
  if (valor === null) return "";
  return String(valor).replace(/\s+/g, " ").trim();
}

function comoData(valor: unknown): Date | null {
  if (valor instanceof Date) return valor;
  if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}T/.test(valor)) return new Date(valor);
  return null;
}

/** Primeira fórmula encontrada numa coluna, varrendo as linhas de dados. */
function formulaDaColuna(sheet: ExcelJS.Worksheet, coluna: number, linhas: number[]): string | null {
  for (const linha of linhas) {
    const valor = sheet.getRow(linha).getCell(coluna).value;
    if (valor !== null && typeof valor === "object" && "formula" in valor && typeof valor.formula === "string") {
      return valor.formula;
    }
  }
  return null;
}

function letrasParaColuna(letras: string): number {
  let n = 0;
  for (const letra of letras.toUpperCase()) n = n * 26 + (letra.charCodeAt(0) - 64);
  return n;
}

/**
 * Divisor explícito de uma fórmula de média, ex. "SUM(AM8:AS8)/7" -> 7,
 * "((J8+K8+L8+M8)/4)" -> 4. Devolve null quando não há divisão (ex. "SUM(B8)"),
 * caso em que não dá para conferir o tamanho do grupo.
 *
 * É a única fonte confiável de "quantas armadilhas o produtor considera neste
 * ponto": as colunas referenciadas podem incluir armadilhas desativadas ou
 * colunas fora dos limites de seção, que o script descarta.
 */
function divisorDaFormula(formula: string): number | null {
  const achado = /\/\s*(\d+)\s*\)*\s*$/.exec(formula.trim());
  return achado ? Number(achado[1]) : null;
}

/** Colunas referenciadas por uma fórmula de média, ex. "SUM(AM8:AS8)/7" -> 39..45. */
function colunasDaFormula(formula: string): number[] {
  const colunas = new Set<number>();
  const referencia = /\$?([A-Z]{1,3})\$?\d+(?:\s*:\s*\$?([A-Z]{1,3})\$?\d+)?/g;
  let achado: RegExpExecArray | null;
  while ((achado = referencia.exec(formula)) !== null) {
    const inicio = letrasParaColuna(achado[1]);
    const fim = achado[2] ? letrasParaColuna(achado[2]) : inicio;
    for (let c = Math.min(inicio, fim); c <= Math.max(inicio, fim); c++) colunas.add(c);
  }
  return [...colunas];
}

// ---------------------------------------------------------------------------
// Casamento de talhão
// ---------------------------------------------------------------------------

type TalhaoBasico = { id: string; nomeCodinome: string; especie: string | null; variedade: string | null; anoPlantio: number | null };

type Casamento =
  | { ok: true; talhao: TalhaoBasico; regra: string }
  | { ok: false; motivo: string; candidatos: string[] };

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function palavras(s: string): string[] {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((p) => p.length >= 3);
}

/** Remove o índice da armadilha: "13 - Gala 23" -> "Gala 23". */
function semIndice(rotulo: string): string {
  return rotulo.replace(/^\d+\s*[-\s]\s*/, "").trim();
}

function anoDoTalhao(talhao: TalhaoBasico): number | null {
  const noNome = /\b(19|20)\d{2}\b/.exec(talhao.nomeCodinome);
  if (noNome) return Number(noNome[0]);
  return talhao.anoPlantio;
}

/** true se algum token do rótulo é prefixo de alguma palavra do talhão (ou o contrário). */
function variedadeCombina(tokensRotulo: string[], talhao: TalhaoBasico): boolean {
  const tokensTalhao = [
    ...palavras(talhao.nomeCodinome),
    ...palavras(talhao.variedade ?? ""),
    ...palavras(talhao.especie ?? ""),
  ].filter((t) => t !== "quadra");
  return tokensRotulo.some((tr) => tokensTalhao.some((tt) => tt.startsWith(tr) || tr.startsWith(tt)));
}

function casarTalhao(talhoes: TalhaoBasico[], aba: string, rotulo: string): Casamento {
  const nome = semIndice(rotulo);

  // R1 — alias manual explícito
  const alias = ALIASES_TALHAO[`${aba}|${rotulo}`];
  if (alias) {
    const talhao = talhoes.find((t) => t.nomeCodinome === alias);
    if (talhao) return { ok: true, talhao, regra: "alias manual" };
    return { ok: false, motivo: `alias manual "${alias}" não existe entre os talhões`, candidatos: [] };
  }

  // R2 — nome idêntico (ignorando acentos/pontuação)
  const exato = talhoes.filter((t) => normalizar(t.nomeCodinome) === normalizar(nome));
  if (exato.length === 1) return { ok: true, talhao: exato[0], regra: "nome exato" };

  const tokens = palavras(nome).filter((t) => t !== "desativada" && t !== "quadra");

  // R3 — número de quadra ("...-Q15", "Q 10"): convenção da aba Lapinha
  const quadra = /\bq\s*(\d{1,2})\b/i.exec(nome.replace(/-/g, " "));
  if (quadra) {
    const numero = Number(quadra[1]);
    const porQuadra = talhoes.filter((t) => new RegExp(`quadra\\s*${numero}$`, "i").test(t.nomeCodinome.trim()));
    if (porQuadra.length === 0) {
      return { ok: false, motivo: `nenhum talhão na quadra ${numero}`, candidatos: [] };
    }
    const comVariedade = porQuadra.filter((t) => variedadeCombina(tokens, t));
    if (comVariedade.length === 1) {
      return { ok: true, talhao: comVariedade[0], regra: `quadra ${numero} + variedade` };
    }
    if (comVariedade.length > 1) {
      return { ok: false, motivo: `quadra ${numero} ambígua`, candidatos: comVariedade.map((t) => t.nomeCodinome) };
    }
    if (porQuadra.length === 1) {
      // Quadra única, mas a variedade do rótulo não bate com o cadastro:
      // não casar automaticamente — pode ser talhão errado.
      return {
        ok: false,
        motivo: `quadra ${numero} única, mas variedade do rótulo não confere com o cadastro`,
        candidatos: porQuadra.map((t) => t.nomeCodinome),
      };
    }
    return { ok: false, motivo: `quadra ${numero} ambígua`, candidatos: porQuadra.map((t) => t.nomeCodinome) };
  }

  // R4 — variedade + ano abreviado ("Kampai 11" -> Kampai 2011): convenção da aba Pomo Sul
  const doisDigitos = /(?:^|[^0-9])(\d{2})(?![0-9])/.exec(nome);
  if (doisDigitos && tokens.length > 0) {
    const ano = 2000 + Number(doisDigitos[1]);
    const porAno = talhoes.filter((t) => anoDoTalhao(t) === ano);
    const comVariedade = porAno.filter((t) => variedadeCombina(tokens, t));
    if (comVariedade.length === 1) return { ok: true, talhao: comVariedade[0], regra: `variedade + ano ${ano}` };
    if (comVariedade.length > 1) {
      return { ok: false, motivo: `variedade + ano ${ano} ambíguo`, candidatos: comVariedade.map((t) => t.nomeCodinome) };
    }
    const soVariedade = talhoes.filter((t) => variedadeCombina(tokens, t));
    if (soVariedade.length === 1) {
      return {
        ok: false,
        motivo: `variedade bate com "${soVariedade[0].nomeCodinome}", mas o ano ${ano} não confere`,
        candidatos: soVariedade.map((t) => t.nomeCodinome),
      };
    }
    return {
      ok: false,
      motivo: `nenhum talhão com variedade do rótulo e ano ${ano}`,
      candidatos: porAno.map((t) => t.nomeCodinome),
    };
  }

  return { ok: false, motivo: "rótulo sem quadra nem ano reconhecíveis", candidatos: [] };
}

// ---------------------------------------------------------------------------
// Montagem do plano de importação
// ---------------------------------------------------------------------------

type Leitura = { data: Date; quantidade: number };

type ColunaArmadilha = {
  coluna: number;
  rotulo: string;
  leituras: Leitura[];
};

type PontoPlanejado = {
  nome: string;
  tipoPraga: TipoPraga;
  armadilhas: { rotulo: string; talhaoId: string; talhaoNome: string; leituras: Leitura[] }[];
};

type Ignorada = { coluna: number; rotulo: string; motivo: string };

function ehArmadilha(rotulo: string): boolean {
  return /^\d{1,2}\s*[-\s]\s*\S/.test(rotulo);
}

function limparRotuloGrupo(rotulo: string): string {
  return rotulo.replace(/^m[ée]dia\s*/i, "").trim();
}

async function main() {
  if (!CAMINHO_PLANILHA) {
    console.error("Uso: tsx scripts/importar-monitoramento-pragas.ts <caminho.xlsx> [--gravar] [--safra=2026/2027] [--verbose]");
    process.exit(1);
  }

  console.log(`Planilha: ${CAMINHO_PLANILHA}`);
  console.log(`Modo: ${MODO_GRAVAR ? "GRAVAÇÃO (escreve no banco)" : "DRY-RUN (nenhuma escrita)"}\n`);

  // O banco já pode ter dados de monitoramento lançados pelo app — importante
  // para conferir as contagens depois da gravação.
  const antes = {
    pontos: await db.pontoMonitoramento.count(),
    armadilhas: await db.armadilha.count(),
    leituras: await db.leituraArmadilha.count(),
  };
  console.log(
    `Banco antes da importação: ${antes.pontos} ponto(s), ${antes.armadilhas} armadilha(s), ${antes.leituras} leitura(s).\n`,
  );

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(CAMINHO_PLANILHA);

  let totalColunas = 0;
  let totalCasadas = 0;
  let totalSemMatch = 0;
  let totalLeituras = 0;
  const pendencias: string[] = [];
  const pendenciasPontos: string[] = [];
  const avisosGerais: string[] = [];

  for (const [nomeAba, secoes] of Object.entries(SECOES_POR_ABA)) {
    const sheet = workbook.getWorksheet(nomeAba);
    if (!sheet) {
      console.warn(`Aba "${nomeAba}" não encontrada — pulando.`);
      continue;
    }

    const nomePropriedade = PROPRIEDADE_POR_ABA[nomeAba] ?? nomeAba;
    const propriedade = await db.propriedade.findUnique({ where: { nome: nomePropriedade } });
    if (!propriedade) {
      console.warn(`Propriedade "${nomePropriedade}" (aba "${nomeAba}") não cadastrada — pulando aba.`);
      continue;
    }
    if (nomePropriedade !== nomeAba) {
      avisosGerais.push(`Aba "${nomeAba}" foi associada à propriedade "${nomePropriedade}" (nomes diferentes — confirmar).`);
    }

    const talhoes: TalhaoBasico[] = await db.talhao.findMany({
      where: { propriedadeId: propriedade.id },
      select: { id: true, nomeCodinome: true, especie: true, variedade: true, anoPlantio: true },
      orderBy: { nomeCodinome: "asc" },
    });

    // Linhas de dados: da 8 até a última com data na coluna 1.
    const linhasComData: { linha: number; data: Date }[] = [];
    for (let linha = 8; linha <= sheet.rowCount; linha++) {
      const data = comoData(desembrulhar(sheet.getRow(linha).getCell(1).value));
      if (data) linhasComData.push({ linha, data });
    }
    const linhas = linhasComData.map((l) => l.linha);

    const titulo = texto(sheet, 1, 1);
    const safraDoTitulo = /safra\s*(\d{4}\s*\/\s*\d{4})/i.exec(titulo)?.[1].replace(/\s+/g, "");
    const safra = SAFRA_FORCADA ?? safraDoTitulo ?? "";
    if (!safra) {
      console.warn(`Aba "${nomeAba}": não consegui ler a safra da linha 1 ("${titulo}") — pulando aba.`);
      continue;
    }

    console.log("=".repeat(100));
    console.log(`ABA "${nomeAba}" → propriedade "${propriedade.nome}" | safra "${safra}"${SAFRA_FORCADA ? " (forçada por --safra)" : ""}`);
    console.log(`título linha 1: ${titulo}`);
    console.log(`talhões cadastrados: ${talhoes.length} | linhas de data: ${linhas.length}` +
      (linhas.length ? ` (${linhasComData[0].data.toISOString().slice(0, 10)} .. ${linhasComData[linhas.length - 1].data.toISOString().slice(0, 10)})` : ""));
    console.log("=".repeat(100));

    if (safraDoTitulo && safraDoTitulo !== "2026/2027") {
      avisosGerais.push(
        `Aba "${nomeAba}": a linha 1 diz "SAFRA ${safraDoTitulo}", mas o arquivo se chama Monitoramento_2026-2027 e as datas vão de ` +
          `${linhasComData[0]?.data.toISOString().slice(0, 10)} a ${linhasComData[linhas.length - 1]?.data.toISOString().slice(0, 10)}. ` +
          `Use --safra=... se o título estiver desatualizado.`,
      );
    }

    const pontosDaAba: PontoPlanejado[] = [];
    const nomesPorPraga = new Map<TipoPraga, Set<string>>();
    const nomesGerados: string[] = [];

    for (const secao of secoes) {
      const rotuloSecao = texto(sheet, 6, secao.colunaInicio) || `colunas ${secao.colunaInicio}-${secao.colunaFim}`;
      console.log(`\n### ${rotuloSecao}  [${secao.tipoPraga}]  colunas ${secao.colunaInicio}-${secao.colunaFim}`);

      // 1) classificar as colunas da seção
      const armadilhas: ColunaArmadilha[] = [];
      const ignoradas: Ignorada[] = [];
      const colunasMedia: number[] = [];

      for (let coluna = secao.colunaInicio; coluna <= secao.colunaFim; coluna++) {
        const rotulo = texto(sheet, 7, coluna);
        if (!rotulo) continue;
        if (/desativ/i.test(rotulo)) {
          ignoradas.push({ coluna, rotulo, motivo: "armadilha desativada" });
          continue;
        }
        if (ehArmadilha(rotulo)) {
          armadilhas.push({ coluna, rotulo, leituras: lerLeituras(sheet, coluna, linhasComData) });
          continue;
        }
        if (/^soma/i.test(rotulo) || /^total/i.test(rotulo)) {
          ignoradas.push({ coluna, rotulo, motivo: "coluna calculada" });
          continue;
        }
        if (formulaDaColuna(sheet, coluna, linhas)) {
          colunasMedia.push(coluna);
        } else {
          // Não é armadilha pelo formato "<n>-<nome>", não é Soma/Total e não tem
          // fórmula: pode ser uma armadilha real com rótulo fora do padrão. Vira
          // pendência explícita — nunca só um número agregado no rodapé.
          ignoradas.push({ coluna, rotulo, motivo: "coluna não reconhecida" });
          const leituras = lerLeituras(sheet, coluna, linhasComData);
          pendencias.push(
            `[${nomeAba}/${texto(sheet, 6, secao.colunaInicio) || `colunas ${secao.colunaInicio}-${secao.colunaFim}`}] ` +
              `c${coluna} "${rotulo}": rótulo fora do padrão "<n>-<nome>", sem fórmula e sem ser Soma/Total — ` +
              `não foi classificada nem como armadilha nem como média. Tem ${leituras.length} valor(es) numérico(s); ` +
              `conferir se é uma armadilha de verdade.`,
          );
        }
      }

      // 2) montar os grupos (pontos) a partir das fórmulas das colunas de média
      // Os nomes precisam ser únicos por (propriedade, tipoPraga, safra) — chave
      // única de PontoMonitoramento. O registro é por aba+praga e inclui também
      // os grupos que acabaram sem armadilha casada, para não reaproveitar nome.
      let nomesUsados = nomesPorPraga.get(secao.tipoPraga);
      if (!nomesUsados) {
        nomesUsados = new Set<string>();
        nomesPorPraga.set(secao.tipoPraga, nomesUsados);
      }
      const grupos: { nome: string; colunas: number[] }[] = [];
      const cobertas = new Set<number>();
      const colunasArmadilha = new Set(armadilhas.map((a) => a.coluna));

      for (const colunaMedia of colunasMedia) {
        const formula = formulaDaColuna(sheet, colunaMedia, linhas) ?? "";
        const referenciadas = colunasDaFormula(formula);
        const membros = referenciadas.filter((c) => colunasArmadilha.has(c));

        // O divisor da fórmula diz sobre quantas armadilhas o produtor calcula a
        // média. Se sobrar diferença, alguma coluna referenciada foi descartada
        // (desativada, fora dos limites da seção, ou não classificada) e a média
        // do app vai divergir da planilha mesmo com todos os talhões casados.
        const divisor = divisorDaFormula(formula);
        if (divisor !== null && membros.length !== divisor) {
          const descartadas = referenciadas
            .filter((c) => !colunasArmadilha.has(c))
            .map((c) => {
              const rotulo = texto(sheet, 7, c);
              let motivo: string;
              if (c < secao.colunaInicio || c > secao.colunaFim) motivo = "fora dos limites da seção";
              else motivo = ignoradas.find((i) => i.coluna === c)?.motivo ?? "não classificada";
              return `c${c}${rotulo ? ` "${rotulo}"` : ""} [${motivo}]`;
            });
          pendenciasPontos.push(
            `[${nomeAba}/${rotuloSecao}] média da coluna c${colunaMedia} divide por ${divisor}, mas só ${membros.length} ` +
              `coluna(s) foram reconhecidas como armadilha` +
              (descartadas.length > 0 ? ` — descartadas: ${descartadas.join(", ")}` : "") +
              `. A média do ponto no app NÃO vai bater com a planilha.`,
          );
        }

        const grupoRow6 = texto(sheet, 6, colunaMedia);
        const partes = [grupoRow6 && grupoRow6 !== rotuloSecao ? grupoRow6 : "", limparRotuloGrupo(texto(sheet, 7, colunaMedia))]
          .filter(Boolean);
        // Quando a planilha não nomeia o grupo, o nome é derivado do rótulo da
        // primeira armadilha do grupo — e NÃO de um índice posicional, que
        // mudaria (criando pontos duplicados numa reexecução) se o produtor
        // inserisse ou removesse uma coluna "Média" na planilha.
        const primeiroMembro = membros.length > 0 ? armadilhas.find((a) => a.coluna === membros[0])?.rotulo : undefined;
        const base =
          partes.join(" — ") ||
          (primeiroMembro ? `${rotuloSecao} — ${primeiroMembro}` : `${rotuloSecao} (sem armadilha ativa)`);
        let nome = base;
        let sufixo = 2;
        while (nomesUsados.has(nome)) nome = `${base} (${sufixo++})`;
        nomesUsados.add(nome);
        if (partes.length === 0) nomesGerados.push(nome);
        membros.forEach((c) => cobertas.add(c));
        grupos.push({ nome, colunas: membros });
      }

      if (colunasMedia.length === 0 && armadilhas.length > 0) {
        avisosGerais.push(
          `Aba "${nomeAba}", seção "${rotuloSecao}": não há coluna "Média" na planilha, então não dá para saber como as ` +
            `${armadilhas.length} armadilha(s) se agrupam — todas foram colocadas num único ponto "${rotuloSecao}". Confirmar com o dono.`,
        );
      }

      const orfas = armadilhas.filter((a) => !cobertas.has(a.coluna)).map((a) => a.coluna);
      if (orfas.length > 0) {
        const nomeOrfas = colunasMedia.length === 0 ? rotuloSecao : `${rotuloSecao} — Sem grupo`;
        let nome = nomeOrfas;
        let sufixo = 2;
        while (nomesUsados.has(nome)) nome = `${nomeOrfas} (${sufixo++})`;
        nomesUsados.add(nome);
        grupos.push({ nome, colunas: orfas });
        if (colunasMedia.length > 0) {
          pendencias.push(
            `[${nomeAba}/${rotuloSecao}] colunas sem coluna "Média" correspondente (agrupadas em "${nome}"): ` +
              orfas.map((c) => `c${c} "${armadilhas.find((a) => a.coluna === c)?.rotulo}"`).join(", "),
          );
        }
      }

      const duplicadas = armadilhas.filter((a) => grupos.filter((g) => g.colunas.includes(a.coluna)).length > 1);
      for (const dup of duplicadas) {
        pendencias.push(
          `[${nomeAba}/${rotuloSecao}] coluna c${dup.coluna} "${dup.rotulo}" entra em mais de um grupo de média ` +
            `(${grupos.filter((g) => g.colunas.includes(dup.coluna)).map((g) => `"${g.nome}"`).join(" e ")}) — ` +
            `serão criadas duas Armadilhas com as mesmas leituras.`,
        );
      }

      // 3) casar talhões e imprimir
      for (const grupo of grupos) {
        if (grupo.colunas.length === 0) continue; // grupo cujas armadilhas estão todas desativadas
        console.log(`\n  Ponto "${grupo.nome}"  (${grupo.colunas.length} coluna(s))`);
        const planejado: PontoPlanejado = { nome: grupo.nome, tipoPraga: secao.tipoPraga, armadilhas: [] };
        for (const coluna of grupo.colunas) {
          const arm = armadilhas.find((a) => a.coluna === coluna);
          if (!arm) continue;
          totalColunas++;
          const casamento = casarTalhao(talhoes, nomeAba, arm.rotulo);
          if (!casamento.ok) {
            totalSemMatch++;
            const candidatos = casamento.candidatos.length ? ` | candidatos: ${casamento.candidatos.join(", ")}` : "";
            console.log(`    ⚠  c${coluna} "${arm.rotulo}" → SEM MATCH (${casamento.motivo})${candidatos} — ${arm.leituras.length} leitura(s) NÃO importadas`);
            pendencias.push(
              `[${nomeAba}/${rotuloSecao}] c${coluna} "${arm.rotulo}": ${casamento.motivo}${candidatos} — ${arm.leituras.length} leitura(s)`,
            );
            continue;
          }
          totalCasadas++;
          totalLeituras += arm.leituras.length;
          console.log(
            `    ✓  c${coluna} "${arm.rotulo}" → talhão "${casamento.talhao.nomeCodinome}" [${casamento.regra}] — ${arm.leituras.length} leitura(s)`,
          );
          planejado.armadilhas.push({
            rotulo: arm.rotulo,
            talhaoId: casamento.talhao.id,
            talhaoNome: casamento.talhao.nomeCodinome,
            leituras: arm.leituras,
          });
        }
        // Um ponto importado pela metade produz MÉDIA ERRADA no app (a média do
        // ponto é calculada sobre as armadilhas cadastradas), e a média é o que
        // define o nível de controle. Isso é mais grave do que simplesmente
        // perder leituras — por isso vira pendência explícita.
        if (planejado.armadilhas.length === 0) {
          pendenciasPontos.push(
            `[${nomeAba}/${rotuloSecao}] ponto "${grupo.nome}": NENHUMA das ${grupo.colunas.length} armadilha(s) casou — ponto não será criado.`,
          );
        } else if (planejado.armadilhas.length < grupo.colunas.length) {
          pendenciasPontos.push(
            `[${nomeAba}/${rotuloSecao}] ponto "${grupo.nome}": só ${planejado.armadilhas.length} de ${grupo.colunas.length} armadilhas casaram — ` +
              `a média do ponto no app NÃO vai bater com a coluna "Média" da planilha.`,
          );
        }
        if (planejado.armadilhas.length > 0) pontosDaAba.push(planejado);
      }

      if (MODO_VERBOSE && ignoradas.length > 0) {
        console.log(`\n  (ignoradas: ${ignoradas.map((i) => `c${i.coluna} "${i.rotulo}" [${i.motivo}]`).join(", ")})`);
      } else if (ignoradas.length > 0) {
        // Só as ignoradas ESPERADAS entram no agregado; as "não reconhecidas"
        // já viraram pendência individual acima.
        const desativadas = ignoradas.filter((i) => i.motivo === "armadilha desativada").length;
        const calculadas = ignoradas.filter((i) => i.motivo === "coluna calculada").length;
        const naoReconhecidas = ignoradas.filter((i) => i.motivo === "coluna não reconhecida").length;
        console.log(
          `\n  (${desativadas} desativada(s) e ${calculadas} calculada(s) ignoradas — use --verbose para detalhar` +
            (naoReconhecidas > 0 ? `; ${naoReconhecidas} não reconhecida(s) listada(s) nas PENDÊNCIAS` : "") +
            ")",
        );
      }
    }

    const gerados = nomesGerados.filter((n) => pontosDaAba.some((p) => p.nome === n));
    if (gerados.length > 0) {
      avisosGerais.push(
        `Aba "${nomeAba}": ${gerados.length} ponto(s) ficaram com nome gerado automaticamente porque a planilha não dá ` +
          `nome ao grupo (linhas 6/7 só dizem "Média"): ${gerados.map((n) => `"${n}"`).join(", ")}. Renomear no app depois de importar.`,
      );
    }

    if (MODO_GRAVAR) {
      await gravarAba(propriedade.id, safra, pontosDaAba, nomeAba);
    }
  }

  console.log(`\n${"=".repeat(100)}`);
  console.log("RESUMO");
  console.log("=".repeat(100));
  console.log(`Colunas de armadilha consideradas : ${totalColunas}`);
  console.log(`  casadas com talhão              : ${totalCasadas}`);
  console.log(`  sem match                       : ${totalSemMatch}`);
  console.log(`Leituras ${MODO_GRAVAR ? "importadas               " : "que seriam criadas       "} : ${totalLeituras}`);
  console.log(
    `Total esperado em leituras_armadilha após a gravação: ${antes.leituras} (já existentes) + ${totalLeituras} = ${antes.leituras + totalLeituras}`,
  );

  if (avisosGerais.length > 0) {
    console.log(`\nAVISOS (${avisosGerais.length}):`);
    for (const aviso of avisosGerais) console.log(`  • ${aviso}`);
  }
  if (pendenciasPontos.length > 0) {
    console.log(`\nPONTOS INCOMPLETOS — MÉDIA DIVERGENTE DA PLANILHA (${pendenciasPontos.length}):`);
    for (const pendencia of pendenciasPontos) console.log(`  • ${pendencia}`);
  }
  if (pendencias.length > 0) {
    console.log(`\nPENDÊNCIAS PARA RESOLUÇÃO MANUAL (${pendencias.length}):`);
    for (const pendencia of pendencias) console.log(`  • ${pendencia}`);
  }
  console.log(
    `\nIDEMPOTÊNCIA: a identidade do ponto é o NOME (unique propriedade+praga+nome+safra). Reexecutar com --gravar só ` +
      `mescla se ninguém tiver renomeado os pontos no app nem mexido nas colunas "Média" da planilha desde a última ` +
      `execução — caso contrário são criados pontos DUPLICADOS, não mesclados. Esta é uma migração de uma vez só.`,
  );
  if (!MODO_GRAVAR) {
    console.log("\nNenhuma escrita foi feita no banco. Rode de novo com --gravar depois de conferir o relatório acima.");
  }
}

function lerLeituras(sheet: ExcelJS.Worksheet, coluna: number, linhas: { linha: number; data: Date }[]): Leitura[] {
  const resultado: Leitura[] = [];
  for (const { linha, data } of linhas) {
    const valor = desembrulhar(sheet.getRow(linha).getCell(coluna).value);
    if (typeof valor !== "number" || !Number.isFinite(valor)) continue;
    if (!Number.isInteger(valor)) {
      console.warn(`    ! valor não inteiro em L${linha}C${coluna}: ${valor} — arredondado`);
    }
    resultado.push({ data, quantidade: Math.round(valor) });
  }
  return resultado;
}

// ---------------------------------------------------------------------------
// Gravação (uma transação por aba)
// ---------------------------------------------------------------------------

async function gravarAba(propriedadeId: string, safra: string, pontos: PontoPlanejado[], nomeAba: string) {
  console.log(`\n>>> Gravando aba "${nomeAba}": ${pontos.length} ponto(s)...`);
  const resumo = await db.$transaction(
    async (tx) => {
      let pontosCriados = 0;
      let armadilhasCriadas = 0;
      let leiturasCriadas = 0;

      for (const planejado of pontos) {
        const antes = await tx.pontoMonitoramento.findUnique({
          where: {
            propriedadeId_tipoPraga_nome_safra: {
              propriedadeId,
              tipoPraga: planejado.tipoPraga,
              nome: planejado.nome,
              safra,
            },
          },
          select: { id: true },
        });
        const ponto =
          antes ??
          (await tx.pontoMonitoramento.create({
            data: { propriedadeId, tipoPraga: planejado.tipoPraga, nome: planejado.nome, safra },
            select: { id: true },
          }));
        if (!antes) pontosCriados++;

        for (const arm of planejado.armadilhas) {
          // Armadilha não tem unique natural — findFirst + create para ser idempotente.
          const existente = await tx.armadilha.findFirst({
            where: { pontoMonitoramentoId: ponto.id, talhaoId: arm.talhaoId, rotulo: arm.rotulo },
            select: { id: true },
          });
          const armadilha =
            existente ??
            (await tx.armadilha.create({
              data: { pontoMonitoramentoId: ponto.id, talhaoId: arm.talhaoId, rotulo: arm.rotulo },
              select: { id: true },
            }));
          if (!existente) armadilhasCriadas++;

          // Não duplica leituras já importadas numa execução anterior.
          const jaGravadas = await tx.leituraArmadilha.findMany({
            where: { armadilhaId: armadilha.id },
            select: { data: true },
          });
          const datasExistentes = new Set(jaGravadas.map((l) => l.data.getTime()));
          const novas = arm.leituras.filter((l) => !datasExistentes.has(l.data.getTime()));
          if (novas.length > 0) {
            await tx.leituraArmadilha.createMany({
              data: novas.map((l) => ({ armadilhaId: armadilha.id, data: l.data, quantidade: l.quantidade })),
            });
            leiturasCriadas += novas.length;
          }
        }
      }

      return { pontosCriados, armadilhasCriadas, leiturasCriadas };
    },
    { timeout: 120_000 },
  );

  console.log(
    `<<< Aba "${nomeAba}" gravada: ${resumo.pontosCriados} ponto(s), ${resumo.armadilhasCriadas} armadilha(s), ${resumo.leiturasCriadas} leitura(s).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
