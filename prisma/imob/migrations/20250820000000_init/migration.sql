-- CreateEnum
CREATE TYPE "StatusUsuarioImob" AS ENUM ('ATIVO', 'INATIVO');

-- CreateTable
CREATE TABLE "imob_imobiliarias" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "creci" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "cep" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "logoUrl" TEXT,
    "corPrimaria" TEXT NOT NULL DEFAULT '#2563EB',
    "onboardingConcluido" BOOLEAN NOT NULL DEFAULT false,
    "onboardingEtapa" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imob_imobiliarias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imob_papeis" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "sistema" BOOLEAN NOT NULL DEFAULT false,
    "permissoes" TEXT[],
    "imobiliariaId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imob_papeis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imob_usuarios" (
    "id" TEXT NOT NULL,
    "authUserId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT,
    "status" "StatusUsuarioImob" NOT NULL DEFAULT 'ATIVO',
    "ultimoAcessoEm" TIMESTAMP(3),
    "imobiliariaId" TEXT NOT NULL,
    "papelId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imob_usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imob_logs_auditoria" (
    "id" TEXT NOT NULL,
    "imobiliariaId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "valorAnterior" JSONB,
    "valorNovo" JSONB,
    "ip" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "imob_logs_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "imob_papeis_imobiliariaId_idx" ON "imob_papeis"("imobiliariaId");

-- CreateIndex
CREATE UNIQUE INDEX "imob_papeis_imobiliariaId_nome_key" ON "imob_papeis"("imobiliariaId", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "imob_usuarios_authUserId_key" ON "imob_usuarios"("authUserId");

-- CreateIndex
CREATE INDEX "imob_usuarios_imobiliariaId_idx" ON "imob_usuarios"("imobiliariaId");

-- CreateIndex
CREATE INDEX "imob_usuarios_papelId_idx" ON "imob_usuarios"("papelId");

-- CreateIndex
CREATE UNIQUE INDEX "imob_usuarios_imobiliariaId_email_key" ON "imob_usuarios"("imobiliariaId", "email");

-- CreateIndex
CREATE INDEX "imob_logs_auditoria_imobiliariaId_entidade_entidadeId_idx" ON "imob_logs_auditoria"("imobiliariaId", "entidade", "entidadeId");

-- CreateIndex
CREATE INDEX "imob_logs_auditoria_imobiliariaId_criadoEm_idx" ON "imob_logs_auditoria"("imobiliariaId", "criadoEm");

-- AddForeignKey
ALTER TABLE "imob_papeis" ADD CONSTRAINT "imob_papeis_imobiliariaId_fkey" FOREIGN KEY ("imobiliariaId") REFERENCES "imob_imobiliarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imob_usuarios" ADD CONSTRAINT "imob_usuarios_imobiliariaId_fkey" FOREIGN KEY ("imobiliariaId") REFERENCES "imob_imobiliarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imob_usuarios" ADD CONSTRAINT "imob_usuarios_papelId_fkey" FOREIGN KEY ("papelId") REFERENCES "imob_papeis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imob_logs_auditoria" ADD CONSTRAINT "imob_logs_auditoria_imobiliariaId_fkey" FOREIGN KEY ("imobiliariaId") REFERENCES "imob_imobiliarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imob_logs_auditoria" ADD CONSTRAINT "imob_logs_auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "imob_usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

