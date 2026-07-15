-- Nova opção de Tipo de Atividade para registrar mão de obra de contagem de
-- frutos (base da estimativa de safra do módulo Contagem de Frutos).

INSERT INTO "tipos_atividade" ("id", "nome", "ativo") VALUES
    ('tipoatv_contagem_frutos', 'Contagem de Frutos', true);
