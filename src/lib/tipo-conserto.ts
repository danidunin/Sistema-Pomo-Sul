import type { TipoConserto } from "@/generated/prisma/enums";

export const TIPO_CONSERTO_LABELS: Record<TipoConserto, string> = {
  MOTOR: "Motor",
  TRANSMISSAO: "Transmissão",
  DIRECAO: "Direção",
  RODADO: "Rodado",
  ELETRICO: "Sistema Elétrico",
  HIDRAULICO: "Sistema Hidráulico",
};
