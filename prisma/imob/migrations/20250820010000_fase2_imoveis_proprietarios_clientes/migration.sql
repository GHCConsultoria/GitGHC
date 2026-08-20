-- CreateEnum
CREATE TYPE "TipoImovel" AS ENUM ('CASA', 'APARTAMENTO', 'TERRENO', 'SALA_COMERCIAL', 'LOJA', 'GALPAO', 'FAZENDA', 'CHACARA', 'SITIO', 'PREDIO', 'OUTROS');

-- CreateEnum
CREATE TYPE "FinalidadeImovel" AS ENUM ('VENDA', 'LOCACAO', 'VENDA_LOCACAO');

-- CreateEnum
CREATE TYPE "StatusImovel" AS ENUM ('DISPONIVEL', 'RESERVADO', 'EM_NEGOCIACAO', 'VENDIDO', 'ALUGADO', 'INATIVO');

-- CreateEnum
CREATE TYPE "TipoPessoa" AS ENUM ('FISICA', 'JURIDICA');

-- CreateEnum
CREATE TYPE "TipoCliente" AS ENUM ('COMPRADOR', 'LOCATARIO', 'INVESTIDOR', 'PROPRIETARIO', 'INTERESSADO');

-- CreateTable
CREATE TABLE "imob_proprietarios" (
    "id" TEXT NOT NULL,
    "imobiliariaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipoPessoa" "TipoPessoa" NOT NULL DEFAULT 'FISICA',
    "documento" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "whatsapp" TEXT,
    "endereco" TEXT,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imob_proprietarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imob_clientes" (
    "id" TEXT NOT NULL,
    "imobiliariaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoCliente" NOT NULL DEFAULT 'INTERESSADO',
    "tipoPessoa" "TipoPessoa" NOT NULL DEFAULT 'FISICA',
    "documento" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "whatsapp" TEXT,
    "dataNascimento" TIMESTAMP(3),
    "profissao" TEXT,
    "estadoCivil" TEXT,
    "endereco" TEXT,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "prefTipoImovel" "TipoImovel",
    "prefFinalidade" "FinalidadeImovel",
    "prefValorMin" INTEGER,
    "prefValorMax" INTEGER,
    "prefCidade" TEXT,
    "prefBairro" TEXT,
    "prefQuartos" INTEGER,
    "prefSuites" INTEGER,
    "prefVagas" INTEGER,
    "prefAreaMinima" DOUBLE PRECISION,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imob_clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imob_imoveis" (
    "id" TEXT NOT NULL,
    "imobiliariaId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" "TipoImovel" NOT NULL,
    "finalidade" "FinalidadeImovel" NOT NULL,
    "status" "StatusImovel" NOT NULL DEFAULT 'DISPONIVEL',
    "precoVenda" INTEGER,
    "precoAluguel" INTEGER,
    "condominio" INTEGER,
    "iptu" INTEGER,
    "areaTotal" DOUBLE PRECISION,
    "areaConstruida" DOUBLE PRECISION,
    "quartos" INTEGER,
    "suites" INTEGER,
    "banheiros" INTEGER,
    "vagas" INTEGER,
    "andar" INTEGER,
    "anoConstrucao" INTEGER,
    "aceitaFinanciamento" BOOLEAN NOT NULL DEFAULT false,
    "aceitaPermuta" BOOLEAN NOT NULL DEFAULT false,
    "mobiliado" BOOLEAN NOT NULL DEFAULT false,
    "caracteristicas" TEXT[],
    "cep" TEXT,
    "logradouro" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "tourVirtualUrl" TEXT,
    "criadoPorId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "imob_imoveis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imob_imovel_proprietarios" (
    "id" TEXT NOT NULL,
    "imovelId" TEXT NOT NULL,
    "proprietarioId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "imob_imovel_proprietarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imob_fotos_imovel" (
    "id" TEXT NOT NULL,
    "imovelId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "legenda" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "imob_fotos_imovel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "imob_proprietarios_imobiliariaId_idx" ON "imob_proprietarios"("imobiliariaId");

-- CreateIndex
CREATE INDEX "imob_proprietarios_imobiliariaId_ativo_idx" ON "imob_proprietarios"("imobiliariaId", "ativo");

-- CreateIndex
CREATE INDEX "imob_clientes_imobiliariaId_idx" ON "imob_clientes"("imobiliariaId");

-- CreateIndex
CREATE INDEX "imob_clientes_imobiliariaId_ativo_idx" ON "imob_clientes"("imobiliariaId", "ativo");

-- CreateIndex
CREATE INDEX "imob_clientes_imobiliariaId_tipo_idx" ON "imob_clientes"("imobiliariaId", "tipo");

-- CreateIndex
CREATE INDEX "imob_imoveis_imobiliariaId_status_idx" ON "imob_imoveis"("imobiliariaId", "status");

-- CreateIndex
CREATE INDEX "imob_imoveis_imobiliariaId_tipo_idx" ON "imob_imoveis"("imobiliariaId", "tipo");

-- CreateIndex
CREATE INDEX "imob_imoveis_imobiliariaId_finalidade_idx" ON "imob_imoveis"("imobiliariaId", "finalidade");

-- CreateIndex
CREATE INDEX "imob_imoveis_imobiliariaId_cidade_idx" ON "imob_imoveis"("imobiliariaId", "cidade");

-- CreateIndex
CREATE UNIQUE INDEX "imob_imoveis_imobiliariaId_codigo_key" ON "imob_imoveis"("imobiliariaId", "codigo");

-- CreateIndex
CREATE INDEX "imob_imovel_proprietarios_proprietarioId_idx" ON "imob_imovel_proprietarios"("proprietarioId");

-- CreateIndex
CREATE UNIQUE INDEX "imob_imovel_proprietarios_imovelId_proprietarioId_key" ON "imob_imovel_proprietarios"("imovelId", "proprietarioId");

-- CreateIndex
CREATE INDEX "imob_fotos_imovel_imovelId_idx" ON "imob_fotos_imovel"("imovelId");

-- AddForeignKey
ALTER TABLE "imob_proprietarios" ADD CONSTRAINT "imob_proprietarios_imobiliariaId_fkey" FOREIGN KEY ("imobiliariaId") REFERENCES "imob_imobiliarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imob_clientes" ADD CONSTRAINT "imob_clientes_imobiliariaId_fkey" FOREIGN KEY ("imobiliariaId") REFERENCES "imob_imobiliarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imob_imoveis" ADD CONSTRAINT "imob_imoveis_imobiliariaId_fkey" FOREIGN KEY ("imobiliariaId") REFERENCES "imob_imobiliarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imob_imovel_proprietarios" ADD CONSTRAINT "imob_imovel_proprietarios_imovelId_fkey" FOREIGN KEY ("imovelId") REFERENCES "imob_imoveis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imob_imovel_proprietarios" ADD CONSTRAINT "imob_imovel_proprietarios_proprietarioId_fkey" FOREIGN KEY ("proprietarioId") REFERENCES "imob_proprietarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imob_fotos_imovel" ADD CONSTRAINT "imob_fotos_imovel_imovelId_fkey" FOREIGN KEY ("imovelId") REFERENCES "imob_imoveis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

