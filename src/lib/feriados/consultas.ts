import { prisma } from "@/lib/prisma";

export async function buscarFeriadosDoAno(uf: string, ano: number) {
  return prisma.feriadoForense.findMany({
    where: {
      uf,
      data: {
        gte: new Date(Date.UTC(ano, 0, 1)),
        lte: new Date(Date.UTC(ano, 11, 31)),
      },
    },
    orderBy: { data: "asc" },
  });
}

export async function buscarRevisao(uf: string, ano: number) {
  return prisma.revisaoFeriadosUf.findUnique({ where: { uf_ano: { uf, ano } } });
}
