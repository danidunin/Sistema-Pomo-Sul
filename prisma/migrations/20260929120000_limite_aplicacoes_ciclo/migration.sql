-- Limite opcional de aplicações por ciclo agrícola (maio-abril). Quando
-- preenchido, o produto passa a ser rastreado no resumo do ciclo em
-- Tratamentos — não existe flag "é produto-chave" separada.

ALTER TABLE "produtos" ADD COLUMN "limite_aplicacoes_ciclo" INTEGER;
