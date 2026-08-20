import { prismaImob } from "@/lib/imob/prisma";

/**
 * Consultas de leitura do produto imobiliário. TODA função recebe
 * `imobiliariaId` e filtra por ele — é aqui que o isolamento multi-tenant é
 * garantido no servidor. Nenhuma consulta de negócio sem o filtro de tenant.
 */

export function listarPapeis(imobiliariaId: string) {
  return prismaImob.papel.findMany({
    where: { imobiliariaId },
    orderBy: [{ sistema: "desc" }, { nome: "asc" }],
    include: { _count: { select: { usuarios: true } } },
  });
}

export function listarUsuarios(imobiliariaId: string) {
  return prismaImob.usuarioImob.findMany({
    where: { imobiliariaId },
    orderBy: { nome: "asc" },
    include: { papel: true },
  });
}

/**
 * Busca um usuário garantindo que ele pertence ao tenant — retorna null se o
 * id existir mas for de outra imobiliária. Use sempre esta função (nunca
 * findUnique cru por id) antes de editar/inativar.
 */
export async function obterUsuarioDoTenant(imobiliariaId: string, usuarioId: string) {
  const usuario = await prismaImob.usuarioImob.findUnique({
    where: { id: usuarioId },
    include: { papel: true },
  });
  if (!usuario || usuario.imobiliariaId !== imobiliariaId) {
    return null;
  }
  return usuario;
}

export async function obterPapelDoTenant(imobiliariaId: string, papelId: string) {
  const papel = await prismaImob.papel.findUnique({
    where: { id: papelId },
    include: { _count: { select: { usuarios: true } } },
  });
  if (!papel || papel.imobiliariaId !== imobiliariaId) {
    return null;
  }
  return papel;
}

export function listarAuditoria(imobiliariaId: string, limite = 100) {
  return prismaImob.logAuditoriaImob.findMany({
    where: { imobiliariaId },
    orderBy: { criadoEm: "desc" },
    take: Math.min(Math.max(limite, 1), 500),
    include: { usuario: { select: { nome: true } } },
  });
}

/** Números do painel inicial (Fase 1). Amplia conforme os módulos entram. */
export async function resumoPainel(imobiliariaId: string) {
  const [usuariosAtivos, papeis, eventosAuditoria] = await Promise.all([
    prismaImob.usuarioImob.count({ where: { imobiliariaId, status: "ATIVO" } }),
    prismaImob.papel.count({ where: { imobiliariaId } }),
    prismaImob.logAuditoriaImob.count({ where: { imobiliariaId } }),
  ]);
  return { usuariosAtivos, papeis, eventosAuditoria };
}
