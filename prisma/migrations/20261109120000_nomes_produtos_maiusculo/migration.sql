-- Padroniza os nomes de produto do estoque em MAIÚSCULO (pedido do usuário em 2026-11-09).
--
-- Mexe SOMENTE na coluna "nome". Unidade, quantidade, status (ativo/inativo) e
-- todo o resto ficam exatamente como estão. Acentos são mantidos
-- (ex: "Cloreto de Potássio" -> "CLORETO DE POTÁSSIO").
--
-- O TRANSLATE converte as letras acentuadas explicitamente, para o resultado não
-- depender da configuração de idioma do banco.
UPDATE "produtos"
SET "nome" = UPPER(TRANSLATE("nome", 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ'))
WHERE "nome" <> UPPER(TRANSLATE("nome", 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ'));
