/**
 * Corrige os produtos de estoque que apareciam duplicados no estoque
 * consolidado (Pomo + Lapinha) por causa de nome e/ou unidade escritos de
 * forma diferente entre as fazendas. Lista revisada e aprovada pelo usuário
 * produto por produto em 2026-11-09 (ver conversa do Claude Code).
 *
 * Uso:
 *   npx tsx --env-file=.env scripts/corrigir-duplicidade-estoque-2026-11.ts            # só mostra o que faria
 *   npx tsx --env-file=.env scripts/corrigir-duplicidade-estoque-2026-11.ts --aplicar   # grava de verdade
 *
 * Sem --aplicar o script NUNCA escreve no banco: só lê os produtos atuais e
 * imprime, pra cada ação planejada, o valor atual encontrado e o valor final
 * proposto — confira a lista antes de rodar com --aplicar.
 *
 * Correções de unidade (Ana Técnico, Cloreto de Potássio, Delan, Cercobin):
 * só trocam o RÓTULO da unidade (ex.: "L" → "Kg"), a quantidade numérica
 * cadastrada não é convertida/recalculada — o entendimento é que o número já
 * estava certo e só a unidade foi selecionada errada no cadastro.
 */
import { db } from "@/lib/db";

type AcaoRenomear = {
  tipo: "renomear";
  fazenda: string;
  nomeAtual: string;
  unidadeAtual?: string; // só quando precisa desambiguar (ex.: Viviful)
  nomeNovo?: string;
  unidadeNova?: string;
};

type AcaoApagar = {
  tipo: "apagar";
  fazenda: string;
  nome: string;
  unidade: string;
  motivo: string;
};

type Acao = AcaoRenomear | AcaoApagar;

const ACOES: Acao[] = [
  // --- Renomear (sem mudança de unidade) -----------------------------------
  { tipo: "renomear", fazenda: "Pomo", nomeAtual: "Dimenxion", nomeNovo: "Dimexion" },
  { tipo: "renomear", fazenda: "Lapinha", nomeAtual: "DIMEXION", nomeNovo: "Dimexion" },

  { tipo: "renomear", fazenda: "Lapinha", nomeAtual: "UREIA", nomeNovo: "Ureia" },
  { tipo: "renomear", fazenda: "Pomo", nomeAtual: "Uréia", nomeNovo: "Ureia" },

  { tipo: "renomear", fazenda: "Lapinha", nomeAtual: "TERRA SORB", nomeNovo: "Terra Sorb" },
  { tipo: "renomear", fazenda: "Pomo", nomeAtual: "Terra Sorbe", nomeNovo: "Terra Sorb" },

  { tipo: "renomear", fazenda: "Pomo", nomeAtual: "CaB Wiser", nomeNovo: "Wiser CAB" },
  { tipo: "renomear", fazenda: "Lapinha", nomeAtual: "WISER CAB", nomeNovo: "Wiser CAB" },

  { tipo: "renomear", fazenda: "Lapinha", nomeAtual: "WAKE UP", nomeNovo: "Wake Up" },
  { tipo: "renomear", fazenda: "Pomo", nomeAtual: "Weak Up", nomeNovo: "Wake Up" },

  { tipo: "renomear", fazenda: "Lapinha", nomeAtual: "Optimos", nomeNovo: "Optimus" },
  // Pomo "Optimus" já está com o nome final — nada a fazer.

  { tipo: "renomear", fazenda: "Lapinha", nomeAtual: "MALATHION", nomeNovo: "Malathion" },
  { tipo: "renomear", fazenda: "Pomo", nomeAtual: "Malation", nomeNovo: "Malathion" },

  { tipo: "renomear", fazenda: "Pomo", nomeAtual: "Citoblom", nomeNovo: "Citobloom" },
  { tipo: "renomear", fazenda: "Lapinha", nomeAtual: "CITOBLOON", nomeNovo: "Citobloom" },

  { tipo: "renomear", fazenda: "Pomo", nomeAtual: "Super fosfato triplo", nomeNovo: "Super Fosfato Triplo" },
  { tipo: "renomear", fazenda: "Lapinha", nomeAtual: "SUPER TRIPLO", nomeNovo: "Super Fosfato Triplo" },

  // --- Viravam duplicata (confirmado pelo usuário na revisão) --------------
  { tipo: "renomear", fazenda: "Pomo", nomeAtual: "Biostin", nomeNovo: "Biostin CAB" },
  { tipo: "renomear", fazenda: "Lapinha", nomeAtual: "BIOSTIN CAB", nomeNovo: "Biostin CAB" },

  { tipo: "renomear", fazenda: "Lapinha", nomeAtual: "ETHREL", nomeNovo: "Ethrel 720" },
  // Pomo "Ethrel 720" já está com o nome final — nada a fazer.

  { tipo: "renomear", fazenda: "Lapinha", nomeAtual: "FITOFOS", nomeNovo: "Fitofós K Plus" },
  { tipo: "renomear", fazenda: "Pomo", nomeAtual: "Fitofós K plus", nomeNovo: "Fitofós K Plus" },

  // --- Nome já batia, só a unidade estava errada (rótulo, sem converter) ---
  { tipo: "renomear", fazenda: "Pomo", nomeAtual: "Ana Técnico", unidadeAtual: "Kg", unidadeNova: "gr" },
  { tipo: "renomear", fazenda: "Lapinha", nomeAtual: "ANA TECNICO", nomeNovo: "Ana Técnico" },

  { tipo: "renomear", fazenda: "Lapinha", nomeAtual: "CLORETO DE POTASIO", nomeNovo: "Cloreto de Potássio", unidadeAtual: "L", unidadeNova: "Kg" },
  // Pomo "Cloreto de Potássio" já está com nome e unidade finais — nada a fazer.

  { tipo: "renomear", fazenda: "Lapinha", nomeAtual: "DELAN", unidadeAtual: "L", unidadeNova: "Kg" },
  // Pomo "DELAN" já está em Kg — nada a fazer.

  { tipo: "renomear", fazenda: "Pomo", nomeAtual: "CERCOBIN", unidadeAtual: "L", unidadeNova: "Kg" },
  // Lapinha "CERCOBIN" já está em Kg — nada a fazer.

  // --- Apagar (cadastro zerado, nunca usado) --------------------------------
  { tipo: "apagar", fazenda: "Lapinha", nome: "CLOPANTO", unidade: "L", motivo: "zerado, \"Klopanto\" é o cadastro usado de verdade" },
  { tipo: "apagar", fazenda: "Pomo", nome: "CLOPANTO", unidade: "L", motivo: "zerado, \"Klopanto\" é o cadastro usado de verdade" },
];

async function main() {
  const aplicar = process.argv.includes("--aplicar");
  console.log(aplicar ? "MODO: aplicando de verdade\n" : "MODO: simulação (nada será gravado — rode com --aplicar pra valer)\n");

  let erros = 0;
  let aplicados = 0;

  for (const acao of ACOES) {
    const propriedade = await db.propriedade.findUnique({ where: { nome: acao.fazenda } });
    if (!propriedade) {
      console.error(`✗ Propriedade "${acao.fazenda}" não encontrada.`);
      erros++;
      continue;
    }

    if (acao.tipo === "renomear") {
      const where: { propriedadeId: string; nome: string; unidade?: string } = {
        propriedadeId: propriedade.id,
        nome: acao.nomeAtual,
      };
      if (acao.unidadeAtual) where.unidade = acao.unidadeAtual;

      const encontrados = await db.produto.findMany({ where });
      if (encontrados.length === 0) {
        console.error(`✗ Não achei "${acao.nomeAtual}"${acao.unidadeAtual ? ` (${acao.unidadeAtual})` : ""} em ${acao.fazenda}.`);
        erros++;
        continue;
      }
      if (encontrados.length > 1) {
        console.error(`✗ "${acao.nomeAtual}" em ${acao.fazenda} bateu em ${encontrados.length} produtos — preciso desambiguar por unidade.`);
        erros++;
        continue;
      }

      const produto = encontrados[0];
      const nomeNovo = acao.nomeNovo ?? produto.nome;
      const unidadeNova = acao.unidadeNova ?? produto.unidade;
      const mudouNome = nomeNovo !== produto.nome;
      const mudouUnidade = unidadeNova !== produto.unidade;

      if (!mudouNome && !mudouUnidade) {
        console.log(`· ${acao.fazenda}: "${produto.nome}" (${produto.unidade}) já está correto.`);
        continue;
      }

      console.log(
        `${aplicar ? "✓" : "→"} ${acao.fazenda}: "${produto.nome}" (${produto.unidade}, ${produto.quantidadeDisponivel}) ` +
          `— ${mudouNome ? `nome → "${nomeNovo}"` : ""}${mudouNome && mudouUnidade ? ", " : ""}${mudouUnidade ? `unidade → "${unidadeNova}"` : ""}`,
      );

      if (aplicar) {
        await db.produto.update({
          where: { id: produto.id },
          data: { nome: nomeNovo, unidade: unidadeNova },
        });
      }
      aplicados++;
    } else {
      const produto = await db.produto.findFirst({
        where: { propriedadeId: propriedade.id, nome: acao.nome, unidade: acao.unidade },
      });
      if (!produto) {
        console.log(`· ${acao.fazenda}: "${acao.nome}" (${acao.unidade}) não encontrado — já deve ter sido removido.`);
        continue;
      }

      const usosEmOperacoes = await db.operacaoProduto.count({ where: { produtoId: produto.id } });
      if (usosEmOperacoes > 0) {
        console.error(
          `✗ "${produto.nome}" em ${acao.fazenda} tem ${usosEmOperacoes} uso(s) em tratamentos — não apago (seria apagar histórico real). Verifique manualmente.`,
        );
        erros++;
        continue;
      }
      if (Number(produto.quantidadeDisponivel) !== 0) {
        console.error(`✗ "${produto.nome}" em ${acao.fazenda} não está zerado (${produto.quantidadeDisponivel}) — não apago sem confirmar de novo.`);
        erros++;
        continue;
      }

      console.log(`${aplicar ? "✓" : "→"} ${acao.fazenda}: apagar "${produto.nome}" (${produto.unidade}, zerado) — ${acao.motivo}`);
      if (aplicar) {
        await db.$transaction([
          db.estoqueMovimentacao.deleteMany({ where: { produtoId: produto.id } }),
          db.produto.delete({ where: { id: produto.id } }),
        ]);
      }
      aplicados++;
    }
  }

  console.log(`\n${aplicados} ação(ões) ${aplicar ? "aplicadas" : "planejadas"}, ${erros} erro(s).`);
  if (erros > 0) process.exitCode = 1;
}

main()
  .then(() => process.exit())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
