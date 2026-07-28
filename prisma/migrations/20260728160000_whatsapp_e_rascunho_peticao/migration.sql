-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN "telefoneWhatsapp" TEXT;

-- CreateTable
CREATE TABLE "rascunhos_peticao" (
    "id" TEXT NOT NULL,
    "prazoId" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "criadoPorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rascunhos_peticao_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "rascunhos_peticao" ADD CONSTRAINT "rascunhos_peticao_prazoId_fkey" FOREIGN KEY ("prazoId") REFERENCES "prazos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rascunhos_peticao" ADD CONSTRAINT "rascunhos_peticao_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
