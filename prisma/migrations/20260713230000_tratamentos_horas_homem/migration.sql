-- Horas-Homem em Tratamentos (mesmo padrão de Atividades): quantidade de pessoas +
-- horas por pessoa. Colunas nullable no banco (4 tratamentos já existem sem esse
-- dado) — obrigatoriedade é imposta no formulário/action a partir de agora, sem
-- exigir backfill dos registros antigos.

ALTER TABLE "operacoes_agricolas" ADD COLUMN "numero_pessoas" INTEGER;
ALTER TABLE "operacoes_agricolas" ADD COLUMN "horas_por_pessoa" DECIMAL(6,2);
