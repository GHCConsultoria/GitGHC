-- CreateEnum
CREATE TYPE "OrigemLead" AS ENUM ('SITE', 'INSTAGRAM', 'FACEBOOK', 'WHATSAPP', 'PORTAL', 'INDICACAO', 'GOOGLE', 'TELEFONE', 'PRESENCIAL', 'OUTROS');

-- CreateEnum
CREATE TYPE "EtapaLead" AS ENUM ('NOVO', 'CONTATO_REALIZADO', 'QUALIFICACAO', 'VISITA_AGENDADA', 'VISITA_REALIZADA', 'PROPOSTA', 'NEGOCIACAO', 'FECHADO', 'PERDIDO');

-- CreateEnum
CREATE TYPE "StatusVisita" AS ENUM ('AGENDADA', 'CONFIRMADA', 'REALIZADA', 'CANCELADA', 'NAO_COMPARECEU');

-- CreateEnum
CREATE TYPE "PrioridadeTarefa" AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'URGENTE');

-- CreateEnum
CREATE TYPE "StatusTarefaImob" AS ENUM ('PENDENTE', 'CONCLUIDA');

-- CreateEnum
CREATE TYPE "StatusCaptacao" AS ENUM ('PROSPECTADO', 'CONTATO_REALIZADO', 'VISITA_CAPTACAO', 'DOCUMENTACAO', 'CONTRATO', 'ATIVO', 'ENCERRADO');

-- CreateTable
CREATE TABLE "imob_corretores" (
    "id" TEXT NOT NULL,
    "imobiliariaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT,
    "creci" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "whatsapp" TEXT,
    "dataEntrada" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "metaMensal" INTEGER,
    "percentualComissao" DOUBLE PRECISION,
    "usuarioId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imob_corretores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imob_leads" (
    "id" TEXT NOT NULL,
    "imobiliariaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "origem" "OrigemLead" NOT NULL DEFAULT 'OUTROS',
    "etapa" "EtapaLead" NOT NULL DEFAULT 'NOVO',
    "valorPretendido" INTEGER,
    "observacoes" TEXT,
    "ultimoContato" TIMESTAMP(3),
    "proximaAcao" TIMESTAMP(3),
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "corretorId" TEXT,
    "imovelId" TEXT,
    "clienteId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imob_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imob_interacoes_lead" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "criadoPorId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "imob_interacoes_lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imob_visitas" (
    "id" TEXT NOT NULL,
    "imobiliariaId" TEXT NOT NULL,
    "imovelId" TEXT NOT NULL,
    "clienteId" TEXT,
    "leadId" TEXT,
    "corretorId" TEXT,
    "data" TIMESTAMP(3) NOT NULL,
    "duracaoMin" INTEGER NOT NULL DEFAULT 30,
    "status" "StatusVisita" NOT NULL DEFAULT 'AGENDADA',
    "observacoes" TEXT,
    "interesse" TEXT,
    "nota" INTEGER,
    "feedback" TEXT,
    "proximoPasso" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imob_visitas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imob_tarefas" (
    "id" TEXT NOT NULL,
    "imobiliariaId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "prioridade" "PrioridadeTarefa" NOT NULL DEFAULT 'MEDIA',
    "prazo" TIMESTAMP(3),
    "status" "StatusTarefaImob" NOT NULL DEFAULT 'PENDENTE',
    "responsavelId" TEXT,
    "clienteId" TEXT,
    "imovelId" TEXT,
    "leadId" TEXT,
    "concluidoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imob_tarefas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imob_captacoes" (
    "id" TEXT NOT NULL,
    "imobiliariaId" TEXT NOT NULL,
    "proprietarioId" TEXT,
    "imovelId" TEXT,
    "corretorId" TEXT,
    "dataCaptacao" TIMESTAMP(3),
    "origem" TEXT,
    "exclusividade" BOOLEAN NOT NULL DEFAULT false,
    "comissaoPercentual" DOUBLE PRECISION,
    "validadeExclusividade" TIMESTAMP(3),
    "status" "StatusCaptacao" NOT NULL DEFAULT 'PROSPECTADO',
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imob_captacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "imob_corretores_imobiliariaId_ativo_idx" ON "imob_corretores"("imobiliariaId", "ativo");

-- CreateIndex
CREATE INDEX "imob_leads_imobiliariaId_etapa_idx" ON "imob_leads"("imobiliariaId", "etapa");

-- CreateIndex
CREATE INDEX "imob_leads_corretorId_idx" ON "imob_leads"("corretorId");

-- CreateIndex
CREATE INDEX "imob_interacoes_lead_leadId_idx" ON "imob_interacoes_lead"("leadId");

-- CreateIndex
CREATE INDEX "imob_visitas_imobiliariaId_data_idx" ON "imob_visitas"("imobiliariaId", "data");

-- CreateIndex
CREATE INDEX "imob_visitas_imobiliariaId_status_idx" ON "imob_visitas"("imobiliariaId", "status");

-- CreateIndex
CREATE INDEX "imob_tarefas_imobiliariaId_status_idx" ON "imob_tarefas"("imobiliariaId", "status");

-- CreateIndex
CREATE INDEX "imob_tarefas_imobiliariaId_prazo_idx" ON "imob_tarefas"("imobiliariaId", "prazo");

-- CreateIndex
CREATE INDEX "imob_captacoes_imobiliariaId_status_idx" ON "imob_captacoes"("imobiliariaId", "status");

-- AddForeignKey
ALTER TABLE "imob_corretores" ADD CONSTRAINT "imob_corretores_imobiliariaId_fkey" FOREIGN KEY ("imobiliariaId") REFERENCES "imob_imobiliarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imob_leads" ADD CONSTRAINT "imob_leads_imobiliariaId_fkey" FOREIGN KEY ("imobiliariaId") REFERENCES "imob_imobiliarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imob_leads" ADD CONSTRAINT "imob_leads_corretorId_fkey" FOREIGN KEY ("corretorId") REFERENCES "imob_corretores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imob_interacoes_lead" ADD CONSTRAINT "imob_interacoes_lead_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "imob_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imob_visitas" ADD CONSTRAINT "imob_visitas_imobiliariaId_fkey" FOREIGN KEY ("imobiliariaId") REFERENCES "imob_imobiliarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imob_visitas" ADD CONSTRAINT "imob_visitas_corretorId_fkey" FOREIGN KEY ("corretorId") REFERENCES "imob_corretores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imob_tarefas" ADD CONSTRAINT "imob_tarefas_imobiliariaId_fkey" FOREIGN KEY ("imobiliariaId") REFERENCES "imob_imobiliarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imob_captacoes" ADD CONSTRAINT "imob_captacoes_imobiliariaId_fkey" FOREIGN KEY ("imobiliariaId") REFERENCES "imob_imobiliarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imob_captacoes" ADD CONSTRAINT "imob_captacoes_corretorId_fkey" FOREIGN KEY ("corretorId") REFERENCES "imob_corretores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

