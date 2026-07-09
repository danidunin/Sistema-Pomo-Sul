import type { TipoOperacao } from "@/generated/prisma/enums";

export const TIPO_OPERACAO_LABELS: Record<TipoOperacao, string> = {
  FITOSSANITARIO: "Tratamento fitossanitário",
  HERBICIDA: "Herbicida",
  ADUBACAO: "Adubação",
  OUTRA: "Outra",
};
