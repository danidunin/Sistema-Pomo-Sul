-- Permite "excluir" uma máquina que já tem manutenções/revisões/operações
-- reais registradas sem perder esse histórico: em vez de apagar, ela é
-- marcada como inativa e some das listas (mesmo padrão já usado em Produto).

ALTER TABLE "maquinas" ADD COLUMN "ativo" BOOLEAN NOT NULL DEFAULT true;
