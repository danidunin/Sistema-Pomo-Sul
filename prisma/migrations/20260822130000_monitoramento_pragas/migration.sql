-- Novo módulo Monitoramento de Pragas (Grapholita molesta, Moscas-das-frutas,
-- Bonagota, Cydia) — substitui a planilha Monitoramento_2026-2027.xlsx.

-- CreateEnum
CREATE TYPE "TipoPraga" AS ENUM ('GRAPHOLITA_MOLESTA', 'MOSCA_DAS_FRUTAS', 'BONAGOTA', 'CYDIA');

-- CreateTable
CREATE TABLE "pontos_monitoramento" (
    "id" TEXT NOT NULL,
    "propriedade_id" TEXT NOT NULL,
    "tipo_praga" "TipoPraga" NOT NULL,
    "nome" TEXT NOT NULL,
    "safra" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pontos_monitoramento_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pontos_monitoramento_propriedade_id_tipo_praga_nome_safra_key" ON "pontos_monitoramento"("propriedade_id", "tipo_praga", "nome", "safra");
CREATE INDEX "pontos_monitoramento_propriedade_id_tipo_praga_safra_idx" ON "pontos_monitoramento"("propriedade_id", "tipo_praga", "safra");

-- CreateTable
CREATE TABLE "armadilhas" (
    "id" TEXT NOT NULL,
    "ponto_monitoramento_id" TEXT NOT NULL,
    "talhao_id" TEXT NOT NULL,
    "rotulo" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "armadilhas_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "armadilhas_ponto_monitoramento_id_idx" ON "armadilhas"("ponto_monitoramento_id");
CREATE INDEX "armadilhas_talhao_id_idx" ON "armadilhas"("talhao_id");

-- CreateTable
CREATE TABLE "leituras_armadilha" (
    "id" TEXT NOT NULL,
    "armadilha_id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leituras_armadilha_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "leituras_armadilha_armadilha_id_data_idx" ON "leituras_armadilha"("armadilha_id", "data");

-- AddForeignKey
ALTER TABLE "pontos_monitoramento" ADD CONSTRAINT "pontos_monitoramento_propriedade_id_fkey" FOREIGN KEY ("propriedade_id") REFERENCES "propriedades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "armadilhas" ADD CONSTRAINT "armadilhas_ponto_monitoramento_id_fkey" FOREIGN KEY ("ponto_monitoramento_id") REFERENCES "pontos_monitoramento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "armadilhas" ADD CONSTRAINT "armadilhas_talhao_id_fkey" FOREIGN KEY ("talhao_id") REFERENCES "talhoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "leituras_armadilha" ADD CONSTRAINT "leituras_armadilha_armadilha_id_fkey" FOREIGN KEY ("armadilha_id") REFERENCES "armadilhas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
