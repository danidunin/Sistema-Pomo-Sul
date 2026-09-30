-- Vínculo opcional entre operações que são, na prática, a mesma aplicação
-- dividida em mais de um lançamento (continuou no dia seguinte, ou separou
-- por causa de um produto diferente numa parte da quadra). Usado só pelo
-- resumo do ciclo para não contar o mesmo produto-chave duas vezes — não
-- afeta estoque, calda nem quantidade, que continuam por operação.

ALTER TABLE "operacoes_agricolas" ADD COLUMN "mesma_aplicacao_de_id" TEXT;

ALTER TABLE "operacoes_agricolas"
  ADD CONSTRAINT "operacoes_agricolas_mesma_aplicacao_de_id_fkey"
  FOREIGN KEY ("mesma_aplicacao_de_id") REFERENCES "operacoes_agricolas"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "operacoes_agricolas_mesma_aplicacao_de_id_idx" ON "operacoes_agricolas"("mesma_aplicacao_de_id");
