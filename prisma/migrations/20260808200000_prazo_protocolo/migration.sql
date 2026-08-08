-- AlterTable
ALTER TABLE "prazos" ADD COLUMN "numeroProtocolo" TEXT;
ALTER TABLE "prazos" ADD COLUMN "protocoladoEm" TIMESTAMP(3);
ALTER TABLE "prazos" ADD COLUMN "comprovanteUrl" TEXT;
ALTER TABLE "prazos" ADD COLUMN "observacaoProtocolo" TEXT;
ALTER TABLE "prazos" ADD COLUMN "protocoladoPorId" TEXT;

-- AddForeignKey
ALTER TABLE "prazos" ADD CONSTRAINT "prazos_protocoladoPorId_fkey" FOREIGN KEY ("protocoladoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
