-- CreateEnum
CREATE TYPE "StatusTarefa" AS ENUM ('PENDENTE', 'CONCLUIDA');

-- AlterTable
ALTER TABLE "prazos" ADD COLUMN "responsavelId" TEXT;
ALTER TABLE "prazos" ADD COLUMN "visualizadoEm" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "tarefas_prazo" (
    "id" TEXT NOT NULL,
    "prazoId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "responsavelId" TEXT,
    "status" "StatusTarefa" NOT NULL DEFAULT 'PENDENTE',
    "concluidoPorId" TEXT,
    "concluidoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tarefas_prazo_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "prazos" ADD CONSTRAINT "prazos_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefas_prazo" ADD CONSTRAINT "tarefas_prazo_prazoId_fkey" FOREIGN KEY ("prazoId") REFERENCES "prazos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefas_prazo" ADD CONSTRAINT "tarefas_prazo_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefas_prazo" ADD CONSTRAINT "tarefas_prazo_concluidoPorId_fkey" FOREIGN KEY ("concluidoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
