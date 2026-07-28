-- AlterTable
ALTER TABLE "escritorios" ADD COLUMN "calendarioFeedToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "escritorios_calendarioFeedToken_key" ON "escritorios"("calendarioFeedToken");
