-- CreateTable
CREATE TABLE "tipos_ato_prazo" (
    "id" TEXT NOT NULL,
    "tipoAto" TEXT NOT NULL,
    "diasPrazo" INTEGER NOT NULL,
    "contagemDiasUteis" BOOLEAN NOT NULL DEFAULT true,
    "descricao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipos_ato_prazo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revisoes_feriados_uf" (
    "id" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "revisado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "revisoes_feriados_uf_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tipos_ato_prazo_tipoAto_key" ON "tipos_ato_prazo"("tipoAto");

-- CreateIndex
CREATE UNIQUE INDEX "revisoes_feriados_uf_uf_ano_key" ON "revisoes_feriados_uf"("uf", "ano");
