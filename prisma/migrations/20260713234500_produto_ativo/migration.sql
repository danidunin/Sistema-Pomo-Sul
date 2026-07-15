-- Permite "excluir" um produto do estoque mesmo quando ele já tem histórico real
-- (movimentações ou uso em tratamentos), sem perder esse histórico: produtos sem
-- nenhum uso são excluídos de verdade; produtos com uso são só marcados como
-- inativos (somem das listas de seleção em novos lançamentos, mas continuam
-- aparecendo normalmente nos registros e relatórios já existentes).

ALTER TABLE "produtos" ADD COLUMN "ativo" BOOLEAN NOT NULL DEFAULT true;
