-- Revisões preventivas (troca de óleo, filtros etc.) passam a ser uma tabela
-- própria, separada de manutenções corretivas. O campo "horimetro" de
-- manutencoes é mantido intacto (histórico antigo), só deixa de ser usado por
-- registros novos.

CREATE TABLE "revisoes" (
    "id" TEXT NOT NULL,
    "maquina_id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "horimetro" DECIMAL(10,1) NOT NULL,
    "servico_realizado" TEXT NOT NULL,
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revisoes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "revisoes_maquina_id_data_idx" ON "revisoes"("maquina_id", "data");

ALTER TABLE "revisoes" ADD CONSTRAINT "revisoes_maquina_id_fkey" FOREIGN KEY ("maquina_id") REFERENCES "maquinas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
