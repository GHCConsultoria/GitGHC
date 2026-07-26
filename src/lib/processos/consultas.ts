import { prisma } from "@/lib/prisma";

export async function buscarProcessosDoEscritorio(escritorioId: string) {
  return prisma.processo.findMany({
    where: { escritorioId },
    orderBy: { criadoEm: "desc" },
  });
}
