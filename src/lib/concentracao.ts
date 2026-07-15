import type { UnidadeDosagem } from "@/generated/prisma/enums";

export const UNIDADE_DOSAGEM_LABELS: Record<UnidadeDosagem, string> = {
  PERCENTUAL: "%",
  ML_100L: "mL/100L",
  G_100L: "g/100L",
  L_HA: "L/ha",
  KG_HA: "kg/ha",
};

const UNIDADES_POR_VOLUME_CALDA: UnidadeDosagem[] = ["PERCENTUAL", "ML_100L", "G_100L"];
const UNIDADES_POR_AREA: UnidadeDosagem[] = ["L_HA", "KG_HA"];

/**
 * Calcula a quantidade final de produto a partir da concentração informada,
 * na unidade "canônica" da dosagem (ver unidadeCanonica). Essa quantidade ainda
 * precisa ser convertida para a unidade cadastrada do produto — ver converterParaUnidadeEstoque.
 *
 * - PERCENTUAL: 1% = 1 kg para cada 100 L de água → quantidade (kg) = (concentração / 100) × volume de calda.
 * - ML_100L / G_100L: dose "por 100L de calda" → quantidade = (concentração / 100) × volume de calda.
 * - L_HA / KG_HA: dose por área → quantidade = concentração × área do talhão (ha).
 *
 * Retorna null se faltar um dado necessário para o cálculo (ex: volume de calda
 * para uma unidade "por 100L", ou área do talhão para uma unidade "por ha").
 */
export function calcularQuantidade({
  concentracao,
  unidadeDosagem,
  volumeCalda,
  areaHa,
}: {
  concentracao: number;
  unidadeDosagem: UnidadeDosagem;
  volumeCalda: number | null;
  areaHa: number | null;
}): number | null {
  if (!Number.isFinite(concentracao) || concentracao <= 0) return null;

  if (UNIDADES_POR_VOLUME_CALDA.includes(unidadeDosagem)) {
    if (!volumeCalda || volumeCalda <= 0) return null;
    return (concentracao / 100) * volumeCalda;
  }

  if (UNIDADES_POR_AREA.includes(unidadeDosagem)) {
    if (!areaHa || areaHa <= 0) return null;
    return concentracao * areaHa;
  }

  return null;
}

/**
 * Unidade "canônica" em que calcularQuantidade() expressa o resultado, antes de
 * converter para a unidade cadastrada do produto. PERCENTUAL é sempre em massa
 * (1% = 1 kg/100L), nunca em volume — mesmo que o produto seja líquido.
 */
export function unidadeCanonica(unidadeDosagem: UnidadeDosagem): "mL" | "g" | "L" | "kg" {
  switch (unidadeDosagem) {
    case "PERCENTUAL":
      return "kg";
    case "ML_100L":
      return "mL";
    case "G_100L":
      return "g";
    case "L_HA":
      return "L";
    case "KG_HA":
      return "kg";
  }
}

/**
 * Converte a quantidade calculada (na unidade canônica da dosagem) para a
 * unidade cadastrada do produto, respeitando sempre essa unidade: se o produto
 * está em kg, o resultado é em peso; se está em litros, em volume (mL↔L, g↔kg).
 * Se a unidade cadastrada não for reconhecida, ou pertencer à família errada
 * (ex: dose em volume para produto cadastrado em peso), a quantidade não é
 * convertida — o cálculo permanece na unidade canônica para não travar o lançamento.
 */
export function converterParaUnidadeEstoque(
  quantidade: number,
  unidadeCalculada: "mL" | "g" | "L" | "kg",
  unidadeEstoque: string,
): number {
  const estoqueNormalizada = unidadeEstoque.trim().toLowerCase();

  const equivalencias: Record<string, string[]> = {
    l: ["l", "litro", "litros"],
    ml: ["ml", "mililitro", "mililitros"],
    kg: ["kg", "quilo", "quilos", "quilograma", "quilogramas"],
    g: ["g", "grama", "gramas"],
  };

  const encontrarBase = (valor: string) =>
    Object.entries(equivalencias).find(([, formas]) => formas.includes(valor))?.[0];

  const baseEstoque = encontrarBase(estoqueNormalizada);
  if (!baseEstoque) return quantidade;

  if (unidadeCalculada === baseEstoque) return quantidade;
  if (unidadeCalculada === "mL" && baseEstoque === "l") return quantidade / 1000;
  if (unidadeCalculada === "L" && baseEstoque === "ml") return quantidade * 1000;
  if (unidadeCalculada === "g" && baseEstoque === "kg") return quantidade / 1000;
  if (unidadeCalculada === "kg" && baseEstoque === "g") return quantidade * 1000;

  return quantidade;
}
