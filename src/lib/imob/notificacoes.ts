import { prismaImob } from "@/lib/imob/prisma";

/**
 * Notificações internas (Fase 6). `notificar` é chamada por ações do domínio
 * quando acontece algo relevante (novo lead, venda, proposta aceita, ...).
 * Nível de tenant — visível a toda a imobiliária. Nunca deve derrubar a ação
 * de negócio que a disparou, por isso engole o próprio erro.
 */

export type TipoNotificacao =
  | "LEAD"
  | "PROPOSTA"
  | "VENDA"
  | "VISITA"
  | "CONTRATO"
  | "FINANCEIRO"
  | "TAREFA"
  | "SISTEMA";

export async function notificar(
  imobiliariaId: string,
  dados: { tipo: TipoNotificacao; titulo: string; mensagem: string; link?: string | null },
): Promise<void> {
  try {
    await prismaImob.notificacao.create({
      data: {
        imobiliariaId,
        tipo: dados.tipo,
        titulo: dados.titulo,
        mensagem: dados.mensagem,
        link: dados.link ?? null,
      },
    });
  } catch (erro) {
    console.error("[imob] falha ao notificar:", erro);
  }
}

export function listarNotificacoes(imobiliariaId: string, limite = 50) {
  return prismaImob.notificacao.findMany({
    where: { imobiliariaId },
    orderBy: { criadoEm: "desc" },
    take: Math.min(Math.max(limite, 1), 200),
  });
}

export function contarNaoLidas(imobiliariaId: string) {
  return prismaImob.notificacao.count({ where: { imobiliariaId, lida: false } });
}

export async function obterNotificacaoDoTenant(imobiliariaId: string, id: string) {
  const n = await prismaImob.notificacao.findUnique({ where: { id } });
  if (!n || n.imobiliariaId !== imobiliariaId) return null;
  return n;
}
