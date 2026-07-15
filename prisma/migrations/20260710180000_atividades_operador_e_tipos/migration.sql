-- 1) "Funcionários" de uma atividade passam a ser Operadores (equipe de campo),
--    não mais Usuários (contas de login) — não havia nenhum registro de
--    atividade_funcionarios ainda, então a troca é direta, sem perda de dados.
ALTER TABLE "atividade_funcionarios" DROP CONSTRAINT "atividade_funcionarios_usuario_id_fkey";
ALTER TABLE "atividade_funcionarios" RENAME COLUMN "usuario_id" TO "operador_id";
ALTER TABLE "atividade_funcionarios" ADD CONSTRAINT "atividade_funcionarios_operador_id_fkey" FOREIGN KEY ("operador_id") REFERENCES "operadores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 2) Padroniza a lista de Tipo de Atividade (nomes em substantivo) e define a
--    ordem de exibição explícita, na ordem pedida pelo usuário.
ALTER TABLE "tipos_atividade" ADD COLUMN "ordem" INTEGER NOT NULL DEFAULT 0;

UPDATE "tipos_atividade" SET "nome" = 'Colheita', "ordem" = 1 WHERE "nome" = 'Colher';
UPDATE "tipos_atividade" SET "nome" = 'Corte de Cavalos', "ordem" = 2 WHERE "nome" = 'Cortar cavalos';
UPDATE "tipos_atividade" SET "ordem" = 3 WHERE "nome" = 'Outros';
UPDATE "tipos_atividade" SET "ordem" = 4 WHERE "nome" = 'Plantio';
UPDATE "tipos_atividade" SET "nome" = 'Poda', "ordem" = 5 WHERE "nome" = 'Podar';
UPDATE "tipos_atividade" SET "nome" = 'Raleio', "ordem" = 6 WHERE "nome" = 'Ralear';
UPDATE "tipos_atividade" SET "nome" = 'Foice', "ordem" = 7 WHERE "nome" = 'Roçar';
UPDATE "tipos_atividade" SET "nome" = 'Moagem de Galhos', "ordem" = 9 WHERE "nome" = 'Triturar galhos';

-- Tipos que não existem na lista nova e não têm nenhuma atividade registrada.
DELETE FROM "tipos_atividade" WHERE "nome" IN ('Arquear galhos', 'Replantio');

INSERT INTO "tipos_atividade" ("id", "nome", "ativo", "ordem") VALUES
    ('tipoatv_enxada', 'Enxada', true, 8),
    ('tipoatv_combate_geada', 'Combate à Geada', true, 10),
    ('tipoatv_manutencao_irrigacao', 'Manutenção da Irrigação', true, 11),
    ('tipoatv_controle_formigas', 'Controle de Formigas', true, 12),
    ('tipoatv_preparo_calda', 'Preparo de Calda', true, 13);
