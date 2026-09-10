-- Consulta visual da planilha de Monitoramento de Pragas — registro único
-- (id fixo "atual"), sem vínculo com pontos_monitoramento/armadilhas.

-- CreateTable
CREATE TABLE "planilha_monitoramento" (
    "id" TEXT NOT NULL DEFAULT 'atual',
    "url" TEXT NOT NULL,
    "nome_arquivo" TEXT NOT NULL,
    "tamanho_bytes" INTEGER NOT NULL,
    "enviado_por_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planilha_monitoramento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "planilha_monitoramento_enviado_por_id_idx" ON "planilha_monitoramento"("enviado_por_id");

-- AddForeignKey
ALTER TABLE "planilha_monitoramento" ADD CONSTRAINT "planilha_monitoramento_enviado_por_id_fkey" FOREIGN KEY ("enviado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
