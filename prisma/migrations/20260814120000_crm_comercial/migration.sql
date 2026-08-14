-- CreateEnum
CREATE TYPE "EstagioLead" AS ENUM ('PROSPECCAO', 'CONTATO_FEITO', 'VISITA_AGENDADA', 'VISITA_REALIZADA', 'PROPOSTA_ENVIADA', 'EM_NEGOCIACAO', 'GANHO', 'PERDIDO');

-- CreateEnum
CREATE TYPE "OrigemLead" AS ENUM ('PROSPECCAO_ATIVA', 'INDICACAO', 'EVENTO', 'REDE_SOCIAL', 'SITE', 'OUTRO');

-- CreateEnum
CREATE TYPE "ResultadoVisita" AS ENUM ('REALIZADA', 'REMARCADA', 'NAO_COMPARECEU', 'CANCELADA');

-- CreateEnum
CREATE TYPE "StatusProximoPasso" AS ENUM ('PENDENTE', 'CONCLUIDO', 'CANCELADO');

-- CreateTable
CREATE TABLE "leads_comerciais" (
    "id" TEXT NOT NULL,
    "escritorioId" TEXT NOT NULL,
    "nomeEmpresa" TEXT NOT NULL,
    "nicho" TEXT NOT NULL,
    "contatoNome" TEXT,
    "contatoCargo" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "cidade" TEXT,
    "uf" TEXT,
    "endereco" TEXT,
    "estagio" "EstagioLead" NOT NULL DEFAULT 'PROSPECCAO',
    "origem" "OrigemLead" NOT NULL DEFAULT 'PROSPECCAO_ATIVA',
    "valorPotencialCentavos" INTEGER,
    "valorFechadoCentavos" INTEGER,
    "ganhoEm" TIMESTAMP(3),
    "perdidoEm" TIMESTAMP(3),
    "motivoPerdaId" TEXT,
    "detalhePerda" TEXT,
    "responsavelId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_comerciais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motivos_perda_comercial" (
    "id" TEXT NOT NULL,
    "escritorioId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "motivos_perda_comercial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitas_comerciais" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "dataVisita" TIMESTAMP(3) NOT NULL,
    "local" TEXT,
    "resultado" "ResultadoVisita" NOT NULL DEFAULT 'REALIZADA',
    "anotacoes" TEXT,
    "registradoPorId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitas_comerciais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proximos_passos_comercial" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "dataPrevista" TIMESTAMP(3) NOT NULL,
    "status" "StatusProximoPasso" NOT NULL DEFAULT 'PENDENTE',
    "concluidoEm" TIMESTAMP(3),
    "responsavelId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proximos_passos_comercial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leads_comerciais_escritorioId_estagio_idx" ON "leads_comerciais"("escritorioId", "estagio");

-- CreateIndex
CREATE UNIQUE INDEX "motivos_perda_comercial_escritorioId_descricao_key" ON "motivos_perda_comercial"("escritorioId", "descricao");

-- CreateIndex
CREATE INDEX "visitas_comerciais_leadId_idx" ON "visitas_comerciais"("leadId");

-- CreateIndex
CREATE INDEX "proximos_passos_comercial_leadId_idx" ON "proximos_passos_comercial"("leadId");

-- CreateIndex
CREATE INDEX "proximos_passos_comercial_status_dataPrevista_idx" ON "proximos_passos_comercial"("status", "dataPrevista");

-- AddForeignKey
ALTER TABLE "leads_comerciais" ADD CONSTRAINT "leads_comerciais_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "escritorios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads_comerciais" ADD CONSTRAINT "leads_comerciais_motivoPerdaId_fkey" FOREIGN KEY ("motivoPerdaId") REFERENCES "motivos_perda_comercial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads_comerciais" ADD CONSTRAINT "leads_comerciais_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motivos_perda_comercial" ADD CONSTRAINT "motivos_perda_comercial_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "escritorios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitas_comerciais" ADD CONSTRAINT "visitas_comerciais_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads_comerciais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitas_comerciais" ADD CONSTRAINT "visitas_comerciais_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proximos_passos_comercial" ADD CONSTRAINT "proximos_passos_comercial_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads_comerciais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proximos_passos_comercial" ADD CONSTRAINT "proximos_passos_comercial_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
