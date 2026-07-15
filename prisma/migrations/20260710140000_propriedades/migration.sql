-- Multi-propriedade: cria a tabela de propriedades, semeia "Pomo" e "Lapinha",
-- e vincula talhões/máquinas/operadores/produtos existentes à Lapinha (dado real
-- confirmado com o usuário: tudo o que já está cadastrado pertence à Lapinha).

CREATE TABLE "propriedades" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "propriedades_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "propriedades_nome_key" ON "propriedades"("nome");

INSERT INTO "propriedades" ("id", "nome") VALUES
    ('prop_pomo', 'Pomo'),
    ('prop_lapinha', 'Lapinha');

-- talhoes
ALTER TABLE "talhoes" ADD COLUMN "propriedade_id" TEXT;
UPDATE "talhoes" SET "propriedade_id" = 'prop_lapinha';
ALTER TABLE "talhoes" ALTER COLUMN "propriedade_id" SET NOT NULL;
ALTER TABLE "talhoes" ADD CONSTRAINT "talhoes_propriedade_id_fkey" FOREIGN KEY ("propriedade_id") REFERENCES "propriedades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "talhoes_propriedade_id_idx" ON "talhoes"("propriedade_id");

-- maquinas
ALTER TABLE "maquinas" ADD COLUMN "propriedade_id" TEXT;
UPDATE "maquinas" SET "propriedade_id" = 'prop_lapinha';
ALTER TABLE "maquinas" ALTER COLUMN "propriedade_id" SET NOT NULL;
ALTER TABLE "maquinas" ADD CONSTRAINT "maquinas_propriedade_id_fkey" FOREIGN KEY ("propriedade_id") REFERENCES "propriedades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "maquinas_propriedade_id_idx" ON "maquinas"("propriedade_id");

-- operadores
ALTER TABLE "operadores" ADD COLUMN "propriedade_id" TEXT;
UPDATE "operadores" SET "propriedade_id" = 'prop_lapinha';
ALTER TABLE "operadores" ALTER COLUMN "propriedade_id" SET NOT NULL;
ALTER TABLE "operadores" ADD CONSTRAINT "operadores_propriedade_id_fkey" FOREIGN KEY ("propriedade_id") REFERENCES "propriedades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "operadores_propriedade_id_idx" ON "operadores"("propriedade_id");

-- produtos
ALTER TABLE "produtos" ADD COLUMN "propriedade_id" TEXT;
UPDATE "produtos" SET "propriedade_id" = 'prop_lapinha';
ALTER TABLE "produtos" ALTER COLUMN "propriedade_id" SET NOT NULL;
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_propriedade_id_fkey" FOREIGN KEY ("propriedade_id") REFERENCES "propriedades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "produtos_propriedade_id_idx" ON "produtos"("propriedade_id");
