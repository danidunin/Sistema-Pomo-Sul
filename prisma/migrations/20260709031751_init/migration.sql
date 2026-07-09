-- CreateEnum
CREATE TYPE "TipoMovimentacao" AS ENUM ('ENTRADA', 'SAIDA');

-- CreateEnum
CREATE TYPE "OrigemMovimentacao" AS ENUM ('MANUAL', 'OPERACAO');

-- CreateEnum
CREATE TYPE "TipoOperacao" AS ENUM ('FITOSSANITARIO', 'HERBICIDA', 'ADUBACAO', 'OUTRA');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "talhoes" (
    "id" TEXT NOT NULL,
    "nome_codinome" TEXT NOT NULL,
    "area_ha" DECIMAL(10,2),
    "cultura" TEXT,
    "especie" TEXT,
    "variedade" TEXT,
    "porta_enxerto" TEXT,
    "ano_plantio" INTEGER,
    "espacamento" TEXT,
    "numero_plantas" INTEGER,
    "observacoes" TEXT,
    "foto_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "talhoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produtos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "quantidade_disponivel" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estoque_movimentacoes" (
    "id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "tipo" "TipoMovimentacao" NOT NULL,
    "quantidade" DECIMAL(12,3) NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "origem_tipo" "OrigemMovimentacao" NOT NULL,
    "origem_operacao_id" TEXT,
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "estoque_movimentacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operacoes_agricolas" (
    "id" TEXT NOT NULL,
    "tipo" "TipoOperacao" NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "talhao_id" TEXT NOT NULL,
    "responsavel_id" TEXT NOT NULL,
    "operador_id" TEXT,
    "maquina_id" TEXT,
    "volume_calda" DECIMAL(10,2),
    "observacoes" TEXT,
    "foto_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operacoes_agricolas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operacao_produtos" (
    "id" TEXT NOT NULL,
    "operacao_id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "quantidade" DECIMAL(12,3) NOT NULL,
    "unidade" TEXT NOT NULL,

    CONSTRAINT "operacao_produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_atividade" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tipos_atividade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atividades" (
    "id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "tipo_atividade_id" TEXT NOT NULL,
    "talhao_id" TEXT NOT NULL,
    "observacoes" TEXT,
    "foto_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "atividades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atividade_funcionarios" (
    "id" TEXT NOT NULL,
    "atividade_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "horas_trabalhadas" DECIMAL(6,2) NOT NULL,

    CONSTRAINT "atividade_funcionarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maquinas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "marca" TEXT,
    "modelo" TEXT,
    "ano" INTEGER,
    "foto_url" TEXT,
    "horimetro_atual" DECIMAL(10,1),
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maquinas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manutencoes" (
    "id" TEXT NOT NULL,
    "maquina_id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "servico_realizado" TEXT NOT NULL,
    "pecas_utilizadas" TEXT,
    "valor" DECIMAL(10,2),
    "horimetro" DECIMAL(10,1),
    "mecanico" TEXT,
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manutencoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fotos" (
    "id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "descricao" TEXT,
    "talhao_id" TEXT,
    "maquina_id" TEXT,
    "url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fotos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "talhoes_nome_codinome_idx" ON "talhoes"("nome_codinome");

-- CreateIndex
CREATE INDEX "produtos_nome_idx" ON "produtos"("nome");

-- CreateIndex
CREATE INDEX "estoque_movimentacoes_produto_id_data_idx" ON "estoque_movimentacoes"("produto_id", "data");

-- CreateIndex
CREATE INDEX "operacoes_agricolas_talhao_id_data_idx" ON "operacoes_agricolas"("talhao_id", "data");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_atividade_nome_key" ON "tipos_atividade"("nome");

-- CreateIndex
CREATE INDEX "atividades_talhao_id_data_idx" ON "atividades"("talhao_id", "data");

-- CreateIndex
CREATE INDEX "manutencoes_maquina_id_data_idx" ON "manutencoes"("maquina_id", "data");

-- CreateIndex
CREATE INDEX "fotos_talhao_id_data_idx" ON "fotos"("talhao_id", "data");

-- CreateIndex
CREATE INDEX "fotos_maquina_id_data_idx" ON "fotos"("maquina_id", "data");

-- AddForeignKey
ALTER TABLE "estoque_movimentacoes" ADD CONSTRAINT "estoque_movimentacoes_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estoque_movimentacoes" ADD CONSTRAINT "estoque_movimentacoes_origem_operacao_id_fkey" FOREIGN KEY ("origem_operacao_id") REFERENCES "operacoes_agricolas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operacoes_agricolas" ADD CONSTRAINT "operacoes_agricolas_talhao_id_fkey" FOREIGN KEY ("talhao_id") REFERENCES "talhoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operacoes_agricolas" ADD CONSTRAINT "operacoes_agricolas_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operacoes_agricolas" ADD CONSTRAINT "operacoes_agricolas_operador_id_fkey" FOREIGN KEY ("operador_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operacoes_agricolas" ADD CONSTRAINT "operacoes_agricolas_maquina_id_fkey" FOREIGN KEY ("maquina_id") REFERENCES "maquinas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operacao_produtos" ADD CONSTRAINT "operacao_produtos_operacao_id_fkey" FOREIGN KEY ("operacao_id") REFERENCES "operacoes_agricolas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operacao_produtos" ADD CONSTRAINT "operacao_produtos_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atividades" ADD CONSTRAINT "atividades_tipo_atividade_id_fkey" FOREIGN KEY ("tipo_atividade_id") REFERENCES "tipos_atividade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atividades" ADD CONSTRAINT "atividades_talhao_id_fkey" FOREIGN KEY ("talhao_id") REFERENCES "talhoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atividade_funcionarios" ADD CONSTRAINT "atividade_funcionarios_atividade_id_fkey" FOREIGN KEY ("atividade_id") REFERENCES "atividades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atividade_funcionarios" ADD CONSTRAINT "atividade_funcionarios_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manutencoes" ADD CONSTRAINT "manutencoes_maquina_id_fkey" FOREIGN KEY ("maquina_id") REFERENCES "maquinas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fotos" ADD CONSTRAINT "fotos_talhao_id_fkey" FOREIGN KEY ("talhao_id") REFERENCES "talhoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fotos" ADD CONSTRAINT "fotos_maquina_id_fkey" FOREIGN KEY ("maquina_id") REFERENCES "maquinas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
