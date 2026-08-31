-- Controle de Diesel: tanque(s) da propriedade e movimentações de entrada/saída.
-- Reaproveita o enum "TipoMovimentacao" (ENTRADA/SAIDA) já usado no estoque de produtos —
-- nenhum CREATE TYPE novo é necessário.

CREATE TABLE "tanques_diesel" (
    "id" TEXT NOT NULL,
    "propriedade_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "capacidade_litros" DECIMAL(10,2) NOT NULL,
    "estoque_atual_litros" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "estoque_minimo_litros" DECIMAL(10,2) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tanques_diesel_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tanques_diesel_propriedade_id_idx" ON "tanques_diesel"("propriedade_id");

ALTER TABLE "tanques_diesel" ADD CONSTRAINT "tanques_diesel_propriedade_id_fkey" FOREIGN KEY ("propriedade_id") REFERENCES "propriedades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "diesel_movimentacoes" (
    "id" TEXT NOT NULL,
    "tanque_id" TEXT NOT NULL,
    "tipo" "TipoMovimentacao" NOT NULL,
    "quantidade_litros" DECIMAL(10,2) NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diesel_movimentacoes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "diesel_movimentacoes_tanque_id_data_idx" ON "diesel_movimentacoes"("tanque_id", "data");

ALTER TABLE "diesel_movimentacoes" ADD CONSTRAINT "diesel_movimentacoes_tanque_id_fkey" FOREIGN KEY ("tanque_id") REFERENCES "tanques_diesel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
