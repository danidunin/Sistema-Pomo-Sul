-- Simplifica o lançamento de Atividades: em vez de selecionar cada operador
-- individualmente, o usuário informa apenas quantidade de pessoas e horas por
-- pessoa (hora-homem = pessoas × horas). Tabela "atividade_funcionarios" está
-- vazia em produção (0 linhas confirmadas) — sem dado real a preservar.

DROP TABLE "atividade_funcionarios";

ALTER TABLE "atividades" ADD COLUMN "numero_pessoas" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "atividades" ADD COLUMN "horas_por_pessoa" DECIMAL(6,2) NOT NULL DEFAULT 0;
ALTER TABLE "atividades" ALTER COLUMN "numero_pessoas" DROP DEFAULT;
ALTER TABLE "atividades" ALTER COLUMN "horas_por_pessoa" DROP DEFAULT;
