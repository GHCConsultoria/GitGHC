import { prismaImob } from "@/lib/imob/prisma";
import type { Prisma } from "../../../prisma/imob/generated";

export interface EntradaAuditoria {
  imobiliariaId: string;
  // null quando é ação de sistema (seed, cadastro inicial antes de haver usuário)
  usuarioId?: string | null;
  entidade: string;
  entidadeId: string;
  acao: string;
  valorAnterior?: Prisma.InputJsonValue | null;
  valorNovo?: Prisma.InputJsonValue | null;
  ip?: string | null;
}

/**
 * Grava uma linha de auditoria imutável. Chamada dentro das server actions
 * que alteram estado (criar/editar/inativar). Auditoria nunca deve derrubar a
 * operação principal, mas aqui deixamos propagar dentro de uma transação
 * quando o chamador passa o client transacional — a decisão de engolir ou não
 * o erro fica com quem chama (ver acoes.ts).
 */
export async function registrarAuditoria(
  entrada: EntradaAuditoria,
  client: Pick<typeof prismaImob, "logAuditoriaImob"> = prismaImob,
): Promise<void> {
  await client.logAuditoriaImob.create({
    data: {
      imobiliariaId: entrada.imobiliariaId,
      usuarioId: entrada.usuarioId ?? null,
      entidade: entrada.entidade,
      entidadeId: entrada.entidadeId,
      acao: entrada.acao,
      valorAnterior: entrada.valorAnterior ?? undefined,
      valorNovo: entrada.valorNovo ?? undefined,
      ip: entrada.ip ?? null,
    },
  });
}
