-- Troca o campo binário "presença de folhas" por um percentual de enfolhamento
-- (0 a 100). Preserva o único dado real existente: true -> 100%, false -> 0%.

ALTER TABLE "visitas_campo" ADD COLUMN "percentual_enfolhamento" INTEGER;

UPDATE "visitas_campo" SET "percentual_enfolhamento" = 100 WHERE "presenca_folhas" = true;
UPDATE "visitas_campo" SET "percentual_enfolhamento" = 0 WHERE "presenca_folhas" = false;

ALTER TABLE "visitas_campo" DROP COLUMN "presenca_folhas";
