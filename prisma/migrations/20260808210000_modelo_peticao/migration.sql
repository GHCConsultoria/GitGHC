-- CreateTable
CREATE TABLE "modelos_peticao" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tipoAto" TEXT,
    "conteudo" TEXT NOT NULL,
    "escritorioId" TEXT NOT NULL,
    "criadoPorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modelos_peticao_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "modelos_peticao" ADD CONSTRAINT "modelos_peticao_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "escritorios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modelos_peticao" ADD CONSTRAINT "modelos_peticao_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
