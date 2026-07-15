-- Expande o módulo de Máquinas: tipo de conserto (multi-seleção), documentos
-- anexados (PDF) por manutenção, e fotos vinculadas diretamente a uma manutenção.

CREATE TYPE "TipoConserto" AS ENUM ('MOTOR', 'TRANSMISSAO', 'DIRECAO', 'RODADO', 'ELETRICO', 'HIDRAULICO');

ALTER TABLE "manutencoes" ADD COLUMN "tipos_conserto" "TipoConserto"[] NOT NULL DEFAULT '{}';

CREATE TABLE "documentos_manutencao" (
    "id" TEXT NOT NULL,
    "manutencao_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_manutencao_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "documentos_manutencao_manutencao_id_idx" ON "documentos_manutencao"("manutencao_id");

ALTER TABLE "documentos_manutencao" ADD CONSTRAINT "documentos_manutencao_manutencao_id_fkey" FOREIGN KEY ("manutencao_id") REFERENCES "manutencoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "fotos" ADD COLUMN "manutencao_id" TEXT;
CREATE INDEX "fotos_manutencao_id_idx" ON "fotos"("manutencao_id");
ALTER TABLE "fotos" ADD CONSTRAINT "fotos_manutencao_id_fkey" FOREIGN KEY ("manutencao_id") REFERENCES "manutencoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
