-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('RG', 'CPF', 'COMPROVANTE_ENDERECO', 'MATRICULA', 'CONTRATO', 'CERTIDAO', 'COMPROVANTE_RENDA', 'OUTROS');

-- CreateEnum
CREATE TYPE "TipoNotificacao" AS ENUM ('LEAD', 'PROPOSTA', 'VENDA', 'VISITA', 'CONTRATO', 'FINANCEIRO', 'TAREFA', 'SISTEMA');

-- CreateTable
CREATE TABLE "imob_documentos" (
    "id" TEXT NOT NULL,
    "imobiliariaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoDocumento" NOT NULL DEFAULT 'OUTROS',
    "url" TEXT NOT NULL,
    "validade" TIMESTAMP(3),
    "clienteId" TEXT,
    "proprietarioId" TEXT,
    "imovelId" TEXT,
    "contratoId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imob_documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imob_notificacoes" (
    "id" TEXT NOT NULL,
    "imobiliariaId" TEXT NOT NULL,
    "tipo" "TipoNotificacao" NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "link" TEXT,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "lidaEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "imob_notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "imob_documentos_imobiliariaId_tipo_idx" ON "imob_documentos"("imobiliariaId", "tipo");

-- CreateIndex
CREATE INDEX "imob_notificacoes_imobiliariaId_lida_idx" ON "imob_notificacoes"("imobiliariaId", "lida");

-- CreateIndex
CREATE INDEX "imob_notificacoes_imobiliariaId_criadoEm_idx" ON "imob_notificacoes"("imobiliariaId", "criadoEm");

-- AddForeignKey
ALTER TABLE "imob_documentos" ADD CONSTRAINT "imob_documentos_imobiliariaId_fkey" FOREIGN KEY ("imobiliariaId") REFERENCES "imob_imobiliarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imob_notificacoes" ADD CONSTRAINT "imob_notificacoes_imobiliariaId_fkey" FOREIGN KEY ("imobiliariaId") REFERENCES "imob_imobiliarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

