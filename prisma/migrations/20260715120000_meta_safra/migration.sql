-- Meta de frutos por planta passa a ser única por talhão + safra, em vez de
-- digitada em cada contagem individualmente.

CREATE TABLE "metas_safra" (
    "id" TEXT NOT NULL,
    "talhao_id" TEXT NOT NULL,
    "safra" TEXT NOT NULL,
    "meta_frutos_por_planta" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metas_safra_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "metas_safra_talhao_id_safra_key" ON "metas_safra"("talhao_id", "safra");

ALTER TABLE "metas_safra" ADD CONSTRAINT "metas_safra_talhao_id_fkey" FOREIGN KEY ("talhao_id") REFERENCES "talhoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: as 2 contagens reais existentes (talhão "Evinha quadra 10", ambas
-- de julho/2026) são migradas para a safra "2026/2027", com meta 120 (valor da
-- contagem de 12/07/2026), conforme decidido com o usuário.
INSERT INTO "metas_safra" ("id", "talhao_id", "safra", "meta_frutos_por_planta", "updated_at")
SELECT 'metasafra_evinha_quadra10_2026_2027', "talhao_id", '2026/2027', 120.00, CURRENT_TIMESTAMP
FROM "contagens_frutos"
WHERE "talhao_id" = 'cmrebwj3900044rxp0hv4sk68'
LIMIT 1;

ALTER TABLE "contagens_frutos" ADD COLUMN "meta_safra_id" TEXT;

UPDATE "contagens_frutos" SET "meta_safra_id" = 'metasafra_evinha_quadra10_2026_2027'
WHERE "talhao_id" = 'cmrebwj3900044rxp0hv4sk68';

ALTER TABLE "contagens_frutos" ALTER COLUMN "meta_safra_id" SET NOT NULL;
ALTER TABLE "contagens_frutos" DROP COLUMN "meta_frutos_por_planta";

CREATE INDEX "contagens_frutos_meta_safra_id_idx" ON "contagens_frutos"("meta_safra_id");

ALTER TABLE "contagens_frutos" ADD CONSTRAINT "contagens_frutos_meta_safra_id_fkey" FOREIGN KEY ("meta_safra_id") REFERENCES "metas_safra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
