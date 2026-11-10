/**
 * Regras de escrita do nome de produto do estoque.
 *
 * Objetivo: o mesmo produto não pode virar dois cadastros só porque cada
 * fazenda escreveu de um jeito (ex: "DIMEXION" na Lapinha e "Dimenxion" na
 * Pomo). Por isso:
 * - todo nome é salvo em MAIÚSCULO;
 * - ao cadastrar, o sistema mostra produtos já existentes com nome parecido;
 * - na mesma fazenda, não deixa cadastrar o mesmo nome com a mesma unidade.
 */

/** Unidades de estoque oferecidas no cadastro. "gr" segue o que já é usado nas fazendas. */
export const UNIDADES_ESTOQUE = [
  { valor: "L", rotulo: "L (litro)" },
  { valor: "mL", rotulo: "mL (mililitro)" },
  { valor: "Kg", rotulo: "Kg (quilo)" },
  { valor: "gr", rotulo: "gr (grama)" },
  { valor: "un", rotulo: "un (unidade)" },
  { valor: "sc", rotulo: "sc (saco)" },
] as const;

/** Padrão do sistema: nome todo em maiúsculo, sem espaço sobrando nas pontas. */
export function padronizarNomeProduto(nome: string): string {
  return nome.trim().toLocaleUpperCase("pt-BR");
}

function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Chave de comparação: ignora acento, maiúscula/minúscula, espaço e pontuação. */
export function chaveNomeProduto(nome: string): string {
  return semAcento(nome).replace(/[^a-z0-9]/g, "");
}

/** Mesmas palavras em qualquer ordem ("CaB Wiser" = "WISER CAB"). */
function chavePalavras(nome: string): string {
  return semAcento(nome)
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .sort()
    .join(" ");
}

function chaveUnidade(unidade: string): string {
  return unidade.trim().toLowerCase();
}

/** Quantas letras precisam mudar para um texto virar o outro (distância de Levenshtein). */
export function distanciaEdicao(a: string, b: string): number {
  if (a === b) return 0;
  let anterior = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const atual = [i];
    for (let j = 1; j <= b.length; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      atual[j] = Math.min(anterior[j] + 1, atual[j - 1] + 1, anterior[j - 1] + custo);
    }
    anterior = atual;
  }
  return anterior[b.length];
}

/** Só as letras, sem números e símbolos ("ACIDO PARACETICO 15%" → "acidoparacetico"). */
function chaveSoLetras(nome: string): string {
  return semAcento(nome).replace(/[^a-z]/g, "");
}

function palavrasSoLetras(nome: string): string[] {
  return semAcento(nome).split(/[^a-z]+/).filter(Boolean);
}

/** Quantas letras podem estar diferentes, conforme o tamanho do nome. */
function letrasDiferentesAceitas(tamanho: number): number {
  if (tamanho >= 12) return 3;
  if (tamanho >= 6) return 2;
  return 1;
}

/**
 * Pontuação de parecença entre o que está sendo digitado e um produto
 * existente. `null` = não é parecido. Quanto menor, mais parecido.
 */
export function pontuacaoParecido(digitado: string, existente: string): number | null {
  const a = chaveNomeProduto(digitado);
  const b = chaveNomeProduto(existente);
  if (a.length < 3 || !b) return null;
  if (a === b) return 0;
  if (chavePalavras(digitado) === chavePalavras(existente)) return 0;
  if (b.startsWith(a) || (b.length >= 3 && a.startsWith(b))) return 1;

  const distancia = distanciaEdicao(a, b);
  if (distancia <= letrasDiferentesAceitas(Math.min(a.length, b.length))) return 1 + distancia;

  // De novo, só com as letras: números como "15%" ou "720" não podem esconder
  // um nome parecido ("ACIDO PERACETICU" x "ACIDO PARACETICO 15%").
  const la = chaveSoLetras(digitado);
  const lb = chaveSoLetras(existente);
  if (la.length >= 3 && lb.length >= 3) {
    const distanciaLetras = distanciaEdicao(la, lb);
    if (distanciaLetras <= letrasDiferentesAceitas(Math.min(la.length, lb.length))) return 1 + distanciaLetras;
  }

  // Um nome contido no outro, palavra por palavra
  // ("SUPER TRIPLO" x "SUPER FOSFATO TRIPLO", "MIREX" x "FORMICIDA MIREX").
  const pa = palavrasSoLetras(digitado);
  const pb = palavrasSoLetras(existente);
  const [curto, longo] = pa.length <= pb.length ? [pa, pb] : [pb, pa];
  if (curto.join("").length >= 5 && curto.every((p) => longo.includes(p))) return 4;

  return null;
}

/** Mesmo produto = mesmo nome (ignorando acento/maiúscula/espaço) e mesma unidade. */
export function mesmoProduto(
  a: { nome: string; unidade: string },
  b: { nome: string; unidade: string },
): boolean {
  return chaveNomeProduto(a.nome) === chaveNomeProduto(b.nome) && chaveUnidade(a.unidade) === chaveUnidade(b.unidade);
}

export type ProdutoCadastrado = {
  nome: string;
  unidade: string;
  propriedadeId: string;
  propriedadeNome: string;
};

export type ProdutoExistente = {
  nome: string;
  unidade: string;
  fazendas: string[];
  nestaFazenda: boolean;
};

/** Junta o mesmo produto de várias fazendas numa linha só, para a lista de sugestões. */
export function agruparProdutosExistentes(
  produtos: ProdutoCadastrado[],
  propriedadeAtualId: string,
): ProdutoExistente[] {
  const grupos = new Map<string, ProdutoExistente>();
  for (const p of produtos) {
    const chave = `${chaveNomeProduto(p.nome)}|${chaveUnidade(p.unidade)}`;
    let grupo = grupos.get(chave);
    if (!grupo) {
      grupo = { nome: padronizarNomeProduto(p.nome), unidade: p.unidade, fazendas: [], nestaFazenda: false };
      grupos.set(chave, grupo);
    }
    if (!grupo.fazendas.includes(p.propriedadeNome)) grupo.fazendas.push(p.propriedadeNome);
    if (p.propriedadeId === propriedadeAtualId) grupo.nestaFazenda = true;
  }
  return [...grupos.values()];
}

/** Até `limite` produtos existentes parecidos com o nome digitado, do mais parecido pro menos. */
export function buscarParecidos(
  digitado: string,
  existentes: ProdutoExistente[],
  limite = 5,
): ProdutoExistente[] {
  return existentes
    .map((produto) => ({ produto, pontos: pontuacaoParecido(digitado, produto.nome) }))
    .filter((item): item is { produto: ProdutoExistente; pontos: number } => item.pontos !== null)
    .sort((x, y) => x.pontos - y.pontos || x.produto.nome.localeCompare(y.produto.nome, "pt-BR"))
    .slice(0, limite)
    .map((item) => item.produto);
}

/** Valor da lista de unidades que corresponde a uma unidade existente ("KG" → "Kg"). */
export function unidadeDaLista(unidade: string): string {
  const achada = UNIDADES_ESTOQUE.find((u) => u.valor.toLowerCase() === chaveUnidade(unidade));
  return achada ? achada.valor : unidade.trim();
}
