-- CreateEnum
CREATE TYPE "TipoLancamento" AS ENUM ('RECEBER', 'PAGAR');

-- CreateEnum
CREATE TYPE "StatusLancamento" AS ENUM ('PENDENTE', 'PAGO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoComissao" AS ENUM ('CORRETOR_VENDEDOR', 'CORRETOR_CAPTADOR', 'GERENTE', 'IMOBILIARIA');

-- CreateEnum
CREATE TYPE "StatusComissao" AS ENUM ('PREVISTA', 'APROVADA', 'PAGA', 'CANCELADA');

-- CreateTable
CREATE TABLE "imob_lancamentos" (
    "id" TEXT NOT NULL,
    "imobiliariaId" TEXT NOT NULL,
    "tipo" "TipoLancamento" NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoria" TEXT,
    "valor" INTEGER NOT NULL,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "pagamentoEm" TIMESTAMP(3),
    "status" "StatusLancamento" NOT NULL DEFAULT 'PENDENTE',
    "formaPagamento" TEXT,
    "centroCusto" TEXT,
    "clienteId" TEXT,
    "imovelId" TEXT,
    "contratoId" TEXT,
    "corretorId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imob_lancamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imob_comissoes" (
    "id" TEXT NOT NULL,
    "imobiliariaId" TEXT NOT NULL,
    "vendaId" TEXT,
    "locacaoId" TEXT,
    "corretorId" TEXT,
    "tipo" "TipoComissao" NOT NULL,
    "descricao" TEXT,
    "percentual" DOUBLE PRECISION,
    "valorPrevisto" INTEGER NOT NULL,
    "valorAprovado" INTEGER,
    "valorPago" INTEGER,
    "status" "StatusComissao" NOT NULL DEFAULT 'PREVISTA',
    "pagoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imob_comissoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imob_regras_comissao" (
    "id" TEXT NOT NULL,
    "imobiliariaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "percentualTotal" DOUBLE PRECISION NOT NULL,
    "pctCorretorVendedor" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "pctCorretorCaptador" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pctGerente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pctImobiliaria" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imob_regras_comissao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "imob_lancamentos_imobiliariaId_tipo_status_idx" ON "imob_lancamentos"("imobiliariaId", "tipo", "status");

-- CreateIndex
CREATE INDEX "imob_lancamentos_imobiliariaId_vencimento_idx" ON "imob_lancamentos"("imobiliariaId", "vencimento");

-- CreateIndex
CREATE INDEX "imob_comissoes_imobiliariaId_status_idx" ON "imob_comissoes"("imobiliariaId", "status");

-- CreateIndex
CREATE INDEX "imob_comissoes_imobiliariaId_vendaId_idx" ON "imob_comissoes"("imobiliariaId", "vendaId");

-- CreateIndex
CREATE INDEX "imob_regras_comissao_imobiliariaId_ativo_idx" ON "imob_regras_comissao"("imobiliariaId", "ativo");

-- AddForeignKey
ALTER TABLE "imob_lancamentos" ADD CONSTRAINT "imob_lancamentos_imobiliariaId_fkey" FOREIGN KEY ("imobiliariaId") REFERENCES "imob_imobiliarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imob_comissoes" ADD CONSTRAINT "imob_comissoes_imobiliariaId_fkey" FOREIGN KEY ("imobiliariaId") REFERENCES "imob_imobiliarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imob_regras_comissao" ADD CONSTRAINT "imob_regras_comissao_imobiliariaId_fkey" FOREIGN KEY ("imobiliariaId") REFERENCES "imob_imobiliarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

