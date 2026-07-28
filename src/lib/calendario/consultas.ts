import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

function gerarToken(): string {
  return randomBytes(24).toString("hex");
}

/**
 * Garante que o escritório tenha um token de feed de calendário, gerando um
 * na primeira vez que for pedido (não na criação do escritório, pra não
 * gerar segredo nenhum que ninguém vai usar).
 */
export async function garantirTokenFeedCalendario(escritorioId: string): Promise<string> {
  const escritorio = await prisma.escritorio.findUniqueOrThrow({ where: { id: escritorioId } });
  if (escritorio.calendarioFeedToken) {
    return escritorio.calendarioFeedToken;
  }

  const token = gerarToken();
  await prisma.escritorio.update({ where: { id: escritorioId }, data: { calendarioFeedToken: token } });
  return token;
}
