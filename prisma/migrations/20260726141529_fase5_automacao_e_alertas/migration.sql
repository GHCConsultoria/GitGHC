-- CreateEnum
CREATE TYPE "TipoAlertaPrazo" AS ENUM ('D5', 'D2', 'D1');

-- CreateTable
CREATE TABLE "execucoes_cron" (
    "id" TEXT NOT NULL,
    "executadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publicacoesEncontradas" INTEGER NOT NULL,
    "publicacoesNovas" INTEGER NOT NULL,
    "publicacoesNaoIdentificadas" INTEGER NOT NULL,
    "prazosCriados" INTEGER NOT NULL,
    "prazosParaRevisaoManual" INTEGER NOT NULL,
    "sucesso" BOOLEAN NOT NULL,
    "erro" TEXT,

    CONSTRAINT "execucoes_cron_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertas_prazo_enviados" (
    "id" TEXT NOT NULL,
    "prazoId" TEXT NOT NULL,
    "tipo" "TipoAlertaPrazo" NOT NULL,
    "enviadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alertas_prazo_enviados_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "alertas_prazo_enviados_prazoId_tipo_key" ON "alertas_prazo_enviados"("prazoId", "tipo");

-- AddForeignKey
ALTER TABLE "alertas_prazo_enviados" ADD CONSTRAINT "alertas_prazo_enviados_prazoId_fkey" FOREIGN KEY ("prazoId") REFERENCES "prazos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
