-- AlterTable
ALTER TABLE "processos" ADD COLUMN "responsavelId" TEXT;

-- AddForeignKey
ALTER TABLE "processos" ADD CONSTRAINT "processos_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
