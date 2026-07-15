-- Novo módulo Contagem de Frutos / Estimativa de Safra.

CREATE TABLE "contagens_frutos" (
    "id" TEXT NOT NULL,
    "propriedade_id" TEXT NOT NULL,
    "talhao_id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "meta_frutos_por_planta" DECIMAL(10,2) NOT NULL,
    "numero_plantas_amostradas" INTEGER NOT NULL,
    "frutos_contados" INTEGER NOT NULL,
    "area_ha" DECIMAL(10,2) NOT NULL,
    "plantas_por_hectare" DECIMAL(10,2) NOT NULL,
    "peso_medio_fruto_g" DECIMAL(10,2) NOT NULL,
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contagens_frutos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "contagens_frutos_talhao_id_data_idx" ON "contagens_frutos"("talhao_id", "data");

ALTER TABLE "contagens_frutos" ADD CONSTRAINT "contagens_frutos_propriedade_id_fkey" FOREIGN KEY ("propriedade_id") REFERENCES "propriedades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contagens_frutos" ADD CONSTRAINT "contagens_frutos_talhao_id_fkey" FOREIGN KEY ("talhao_id") REFERENCES "talhoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
