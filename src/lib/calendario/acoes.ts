"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { obterUsuarioAtual } from "@/lib/auth";

export type ResultadoToken = { sucesso: true; token: string } | { sucesso: false; erro: string };

/** Revoga o link do feed de calendário atual e gera um novo — usar se o link vazou. */
export async function regenerarTokenFeedCalendario(): Promise<ResultadoToken> {
  const usuario = await obterUsuarioAtual();
  const token = randomBytes(24).toString("hex");

  await prisma.escritorio.update({
    where: { id: usuario.escritorioId },
    data: { calendarioFeedToken: token },
  });

  // Nunca gravamos o token em si no log de auditoria — é um segredo, e o
  // log não deveria virar mais um lugar onde ele existe em texto puro.
  await prisma.logAuditoria.create({
    data: {
      usuarioId: usuario.id,
      entidade: "Escritorio",
      entidadeId: usuario.escritorioId,
      acao: "REGENERAR_TOKEN_CALENDARIO",
      valorAnterior: Prisma.JsonNull,
      valorNovo: Prisma.JsonNull,
    },
  });

  revalidatePath("/escritorio");
  return { sucesso: true, token };
}
