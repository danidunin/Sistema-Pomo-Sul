-- Volta a ordenar os tipos de atividade em ordem alfabética (nome) em vez de uma
-- ordem manual fixa — a coluna "ordem" deixou de ser usada.
ALTER TABLE "tipos_atividade" DROP COLUMN "ordem";
