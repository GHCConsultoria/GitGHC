-- CreateEnum
CREATE TYPE "StatusProposta" AS ENUM ('RASCUNHO', 'ENVIADA', 'EM_ANALISE', 'ACEITA', 'RECUSADA', 'EXPIRADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "StatusLocacao" AS ENUM ('ATIVO', 'ENCERRADO', 'RESCINDIDO', 'INADIMPLENTE');

-- CreateEnum
CREATE TYPE "TipoContrato" AS ENUM ('ADMINISTRACAO', 'LOCACAO', 'COMPRA_VENDA', 'CAPTACAO', 'PRESTACAO_SERVICOS');

-- CreateEnum
CREATE TYPE "StatusContrato" AS ENUM ('ATIVO', 'ENCERRADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "imob_propostas" (
    "id" TEXT NOT NULL,
    "imobiliariaId" TEXT NOT NULL,
    "imovelId" TEXT NOT NULL,
    "clienteId" TEXT,
    "corretorId" TEXT,
    "valorSolicitado" INTEGER,
    "valorProposto" INTEGER NOT NULL,
    "formaPagamento" TEXT,
    "entrada" INTEGER,
    "financiamento" BOOLEAN NOT NULL DEFAULT false,
    "permuta" BOOLEAN NOT NULL DEFAULT false,
    "observacoes" TEXT,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validade" TIMESTAMP(3),
    "status" "StatusProposta" NOT NULL DEFAULT 'RASCUNHO',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imob_propostas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imob_propostas_historico" (
    "id" TEXT NOT NULL,
    "propostaId" TEXT NOT NULL,
    "statusAnterior" TEXT,
    "statusNovo" TEXT NOT NULL,
    "observacao" TEXT,
    "autorId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "imob_propostas_historico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imob_vendas" (
    "id" TEXT NOT NULL,
    "imobiliariaId" TEXT NOT NULL,
    "imovelId" TEXT NOT NULL,
    "clienteId" TEXT,
    "proprietarioId" TEXT,
    "corretorId" TEXT,
    "propostaId" TEXT,
    "valorVenda" INTEGER NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "formaPagamento" TEXT,
    "financiamento" BOOLEAN NOT NULL DEFAULT false,
    "comissaoValor" INTEGER,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imob_vendas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imob_locacoes" (
    "id" TEXT NOT NULL,
    "imobiliariaId" TEXT NOT NULL,
    "imovelId" TEXT NOT NULL,
    "proprietarioId" TEXT,
    "locatarioId" TEXT,
    "corretorId" TEXT,
    "fiadorNome" TEXT,
    "valorAluguel" INTEGER NOT NULL,
    "condominio" INTEGER,
    "iptu" INTEGER,
    "seguro" INTEGER,
    "caucao" INTEGER,
    "dataInicial" TIMESTAMP(3) NOT NULL,
    "dataFinal" TIMESTAMP(3),
    "diaVencimento" INTEGER,
    "indiceReajuste" TEXT,
    "status" "StatusLocacao" NOT NULL DEFAULT 'ATIVO',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imob_locacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imob_contratos" (
    "id" TEXT NOT NULL,
    "imobiliariaId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tipo" "TipoContrato" NOT NULL,
    "imovelId" TEXT,
    "clienteId" TEXT,
    "proprietarioId" TEXT,
    "dataInicio" TIMESTAMP(3),
    "dataFim" TIMESTAMP(3),
    "status" "StatusContrato" NOT NULL DEFAULT 'ATIVO',
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imob_contratos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imob_contratos_documentos" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "imob_contratos_documentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "imob_propostas_imobiliariaId_status_idx" ON "imob_propostas"("imobiliariaId", "status");

-- CreateIndex
CREATE INDEX "imob_propostas_imobiliariaId_imovelId_idx" ON "imob_propostas"("imobiliariaId", "imovelId");

-- CreateIndex
CREATE INDEX "imob_propostas_historico_propostaId_idx" ON "imob_propostas_historico"("propostaId");

-- CreateIndex
CREATE INDEX "imob_vendas_imobiliariaId_data_idx" ON "imob_vendas"("imobiliariaId", "data");

-- CreateIndex
CREATE INDEX "imob_locacoes_imobiliariaId_status_idx" ON "imob_locacoes"("imobiliariaId", "status");

-- CreateIndex
CREATE INDEX "imob_contratos_imobiliariaId_status_idx" ON "imob_contratos"("imobiliariaId", "status");

-- CreateIndex
CREATE INDEX "imob_contratos_imobiliariaId_dataFim_idx" ON "imob_contratos"("imobiliariaId", "dataFim");

-- CreateIndex
CREATE INDEX "imob_contratos_documentos_contratoId_idx" ON "imob_contratos_documentos"("contratoId");

-- AddForeignKey
ALTER TABLE "imob_propostas" ADD CONSTRAINT "imob_propostas_imobiliariaId_fkey" FOREIGN KEY ("imobiliariaId") REFERENCES "imob_imobiliarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imob_propostas_historico" ADD CONSTRAINT "imob_propostas_historico_propostaId_fkey" FOREIGN KEY ("propostaId") REFERENCES "imob_propostas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imob_vendas" ADD CONSTRAINT "imob_vendas_imobiliariaId_fkey" FOREIGN KEY ("imobiliariaId") REFERENCES "imob_imobiliarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imob_locacoes" ADD CONSTRAINT "imob_locacoes_imobiliariaId_fkey" FOREIGN KEY ("imobiliariaId") REFERENCES "imob_imobiliarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imob_contratos" ADD CONSTRAINT "imob_contratos_imobiliariaId_fkey" FOREIGN KEY ("imobiliariaId") REFERENCES "imob_imobiliarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imob_contratos_documentos" ADD CONSTRAINT "imob_contratos_documentos_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "imob_contratos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

