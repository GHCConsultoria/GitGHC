import { prisma } from "@/lib/prisma";

export async function buscarModelosDoEscritorio(escritorioId: string) {
  return prisma.modeloPeticao.findMany({
    where: { escritorioId },
    include: { criadoPor: true },
    orderBy: { titulo: "asc" },
  });
}

/** Modelos aplicáveis a um tipoAto específico: os genéricos (tipoAto null) + os que casam exatamente. */
export async function buscarModelosParaTipoAto(escritorioId: string, tipoAto: string) {
  return prisma.modeloPeticao.findMany({
    where: { escritorioId, OR: [{ tipoAto: null }, { tipoAto }] },
    orderBy: { titulo: "asc" },
  });
}
