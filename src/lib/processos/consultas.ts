import { prisma } from "@/lib/prisma";

export async function buscarProcessosDoEscritorio(escritorioId: string) {
  return prisma.processo.findMany({
    where: { escritorioId },
    include: { responsavel: true },
    orderBy: { criadoEm: "desc" },
  });
}
