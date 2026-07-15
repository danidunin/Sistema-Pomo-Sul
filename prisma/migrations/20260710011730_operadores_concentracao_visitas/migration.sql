-- CreateEnum
CREATE TYPE "UnidadeDosagem" AS ENUM ('PERCENTUAL', 'ML_100L', 'G_100L', 'L_HA', 'KG_HA');

-- CreateTable: Operadores (equipe de campo, separada dos usuários do sistema)
CREATE TABLE "operadores" (
    "id" TEXT NOT NULL,
    "nome_completo" TEXT NOT NULL,
    "apelido" TEXT,
    "cpf" TEXT,
    "telefone" TEXT,
    "funcao" TEXT,
    "equipe" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,
    "foto_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operadores_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "operadores_nome_completo_idx" ON "operadores"("nome_completo");

-- CreateTable: Visitas de campo (Histórico do Pomar)
CREATE TABLE "visitas_campo" (
    "id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "talhao_id" TEXT NOT NULL,
    "temperatura" DECIMAL(4,1),
    "presenca_folhas" BOOLEAN,
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitas_campo_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "visitas_campo_talhao_id_data_idx" ON "visitas_campo"("talhao_id", "data");

ALTER TABLE "visitas_campo" ADD CONSTRAINT "visitas_campo_talhao_id_fkey"
    FOREIGN KEY ("talhao_id") REFERENCES "talhoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: Produtos ganham unidade de dosagem
ALTER TABLE "produtos" ADD COLUMN "unidade_dosagem" "UnidadeDosagem";

-- AlterTable: Itens de operação ganham concentração (quantidade passa a ser sempre calculada)
ALTER TABLE "operacao_produtos" ADD COLUMN "concentracao" DECIMAL(10,3);

-- AlterTable: Fotos podem se referir a uma visita de campo
ALTER TABLE "fotos" ADD COLUMN "visita_campo_id" TEXT;
CREATE INDEX "fotos_visita_campo_id_idx" ON "fotos"("visita_campo_id");
ALTER TABLE "fotos" ADD CONSTRAINT "fotos_visita_campo_id_fkey"
    FOREIGN KEY ("visita_campo_id") REFERENCES "visitas_campo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: operador_id passa a referenciar operadores, não usuarios.
-- Vínculos existentes (que apontavam para um usuário) não têm correspondência
-- direta em operadores, então são zerados — é preciso reselecionar o operador
-- nas operações já cadastradas.
ALTER TABLE "operacoes_agricolas" DROP CONSTRAINT IF EXISTS "operacoes_agricolas_operadorId_fkey";
ALTER TABLE "operacoes_agricolas" DROP CONSTRAINT IF EXISTS "operacoes_agricolas_operador_id_fkey";
UPDATE "operacoes_agricolas" SET "operador_id" = NULL WHERE "operador_id" IS NOT NULL;
ALTER TABLE "operacoes_agricolas" ADD CONSTRAINT "operacoes_agricolas_operador_id_fkey"
    FOREIGN KEY ("operador_id") REFERENCES "operadores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
