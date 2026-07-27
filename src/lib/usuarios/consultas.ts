import { prisma } from "@/lib/prisma";

export async function buscarUsuariosDoEscritorio(escritorioId: string) {
  return prisma.usuario.findMany({
    where: { escritorioId },
    orderBy: { criadoEm: "desc" },
  });
}
