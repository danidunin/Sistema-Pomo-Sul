-- Cultura e Espécie representavam a mesma informação (duplicidade).
-- Antes de remover a coluna, preserva o valor de cultura em espécie
-- para talhões que não tinham espécie preenchida.
UPDATE "talhoes" SET "especie" = "cultura" WHERE "especie" IS NULL AND "cultura" IS NOT NULL;

ALTER TABLE "talhoes" DROP COLUMN "cultura";
