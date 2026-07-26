-- CreateEnum
CREATE TYPE "RoleUsuario" AS ENUM ('ADVOGADO', 'ASSISTENTE');

-- CreateEnum
CREATE TYPE "ParteRepresentada" AS ENUM ('AUTOR', 'REU', 'TERCEIRO');

-- CreateEnum
CREATE TYPE "StatusPublicacao" AS ENUM ('NAO_IDENTIFICADA', 'VINCULADA', 'DESCARTADA');

-- CreateEnum
CREATE TYPE "StatusPrazo" AS ENUM ('PENDENTE_CONFIRMACAO', 'CONFIRMADO', 'CUMPRIDO', 'DESCARTADO');

-- CreateEnum
CREATE TYPE "TipoFeriado" AS ENUM ('FERIADO', 'SUSPENSAO', 'RECESSO');

-- CreateTable
CREATE TABLE "escritorios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "oab" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "escritorios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "authUserId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "RoleUsuario" NOT NULL,
    "escritorioId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processos" (
    "id" TEXT NOT NULL,
    "numeroCnj" TEXT NOT NULL,
    "cliente" TEXT NOT NULL,
    "varaOrgao" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "tribunal" TEXT NOT NULL,
    "prazoEmDobro" BOOLEAN NOT NULL DEFAULT false,
    "parteRepresentada" "ParteRepresentada" NOT NULL,
    "escritorioId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publicacoes" (
    "id" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "dataDisponibilizacao" TIMESTAMP(3) NOT NULL,
    "dataPublicacao" TIMESTAMP(3),
    "fonte" TEXT NOT NULL,
    "hashConteudo" TEXT NOT NULL,
    "status" "StatusPublicacao" NOT NULL DEFAULT 'NAO_IDENTIFICADA',
    "rawJson" JSONB NOT NULL,
    "processoId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publicacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prazos" (
    "id" TEXT NOT NULL,
    "publicacaoId" TEXT NOT NULL,
    "processoId" TEXT NOT NULL,
    "tipoAto" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "dataInicioContagem" TIMESTAMP(3) NOT NULL,
    "diasPrazo" INTEGER NOT NULL,
    "contagemDiasUteis" BOOLEAN NOT NULL,
    "dataFatal" TIMESTAMP(3) NOT NULL,
    "status" "StatusPrazo" NOT NULL DEFAULT 'PENDENTE_CONFIRMACAO',
    "confirmadoPorId" TEXT,
    "confirmadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prazos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs_auditoria" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "valorAnterior" JSONB,
    "valorNovo" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feriados_forenses" (
    "id" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "tribunal" TEXT,
    "data" TIMESTAMP(3) NOT NULL,
    "descricao" TEXT NOT NULL,
    "tipo" "TipoFeriado" NOT NULL,

    CONSTRAINT "feriados_forenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_authUserId_key" ON "usuarios"("authUserId");

-- CreateIndex
CREATE UNIQUE INDEX "processos_escritorioId_numeroCnj_key" ON "processos"("escritorioId", "numeroCnj");

-- CreateIndex
CREATE UNIQUE INDEX "publicacoes_hashConteudo_key" ON "publicacoes"("hashConteudo");

-- CreateIndex
CREATE INDEX "logs_auditoria_entidade_entidadeId_idx" ON "logs_auditoria"("entidade", "entidadeId");

-- CreateIndex
CREATE UNIQUE INDEX "feriados_forenses_uf_tribunal_data_key" ON "feriados_forenses"("uf", "tribunal", "data");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "escritorios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processos" ADD CONSTRAINT "processos_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "escritorios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publicacoes" ADD CONSTRAINT "publicacoes_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "processos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prazos" ADD CONSTRAINT "prazos_publicacaoId_fkey" FOREIGN KEY ("publicacaoId") REFERENCES "publicacoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prazos" ADD CONSTRAINT "prazos_processoId_fkey" FOREIGN KEY ("processoId") REFERENCES "processos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prazos" ADD CONSTRAINT "prazos_confirmadoPorId_fkey" FOREIGN KEY ("confirmadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs_auditoria" ADD CONSTRAINT "logs_auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
