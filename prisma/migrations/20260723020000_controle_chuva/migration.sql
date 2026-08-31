-- Atividade: talhão passa a ser opcional. A atividade "Chuva" (Horas-Homem) registra uma
-- parada geral da equipe, sem vínculo com um talhão específico. Como todo o resto do sistema
-- deriva propriedadeId através do talhão, adicionamos propriedade_id diretamente na tabela e
-- fazemos o backfill a partir do talhão atual de cada linha existente.

ALTER TABLE "atividades" ADD COLUMN "propriedade_id" TEXT;

UPDATE "atividades" a
SET "propriedade_id" = t."propriedade_id"
FROM "talhoes" t
WHERE t."id" = a."talhao_id";

ALTER TABLE "atividades" ALTER COLUMN "propriedade_id" SET NOT NULL;
ALTER TABLE "atividades" ALTER COLUMN "talhao_id" DROP NOT NULL;

CREATE INDEX "atividades_propriedade_id_idx" ON "atividades"("propriedade_id");

ALTER TABLE "atividades" ADD CONSTRAINT "atividades_propriedade_id_fkey" FOREIGN KEY ("propriedade_id") REFERENCES "propriedades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Controle de Chuva: leitura manual de pluviômetro, única por propriedade.

CREATE TYPE "RelacaoTratamentoDia" AS ENUM ('ANTES', 'DEPOIS');

CREATE TABLE "chuva_registros" (
    "id" TEXT NOT NULL,
    "propriedade_id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "quantidade_mm" DECIMAL(6,2) NOT NULL,
    "relacao_tratamento_dia" "RelacaoTratamentoDia",
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chuva_registros_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "chuva_registros_propriedade_id_data_idx" ON "chuva_registros"("propriedade_id", "data");

ALTER TABLE "chuva_registros" ADD CONSTRAINT "chuva_registros_propriedade_id_fkey" FOREIGN KEY ("propriedade_id") REFERENCES "propriedades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
