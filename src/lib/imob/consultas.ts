import { prismaImob } from "@/lib/imob/prisma";
import type { ListagemImoveisInput } from "@/lib/imob/schemas";
import type { Prisma } from "../../../prisma/imob/generated";

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

// ===========================================================================
// FASE 2 — Proprietários, Clientes, Imóveis (todas filtradas por tenant)
// ===========================================================================

export const TAMANHO_PAGINA = 12;

// --- Proprietários --------------------------------------------------------

export async function listarProprietarios(imobiliariaId: string, busca?: string) {
  const where: Prisma.ProprietarioWhereInput = { imobiliariaId, ativo: true };
  if (busca?.trim()) {
    const q = busca.trim();
    where.OR = [
      { nome: { contains: q, mode: "insensitive" } },
      { documento: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { telefone: { contains: q, mode: "insensitive" } },
    ];
  }
  return prismaImob.proprietario.findMany({
    where,
    orderBy: { nome: "asc" },
    include: { _count: { select: { imoveis: true } } },
  });
}

export async function obterProprietarioDoTenant(imobiliariaId: string, id: string) {
  const p = await prismaImob.proprietario.findUnique({ where: { id } });
  if (!p || p.imobiliariaId !== imobiliariaId) return null;
  return p;
}

/** Só os proprietários ativos, campos mínimos — para selects de imóvel. */
export function listarProprietariosParaSelecao(imobiliariaId: string) {
  return prismaImob.proprietario.findMany({
    where: { imobiliariaId, ativo: true },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });
}

// --- Clientes -------------------------------------------------------------

export async function listarClientes(imobiliariaId: string, busca?: string) {
  const where: Prisma.ClienteWhereInput = { imobiliariaId, ativo: true };
  if (busca?.trim()) {
    const q = busca.trim();
    where.OR = [
      { nome: { contains: q, mode: "insensitive" } },
      { documento: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { telefone: { contains: q, mode: "insensitive" } },
    ];
  }
  return prismaImob.cliente.findMany({ where, orderBy: { nome: "asc" } });
}

export async function obterClienteDoTenant(imobiliariaId: string, id: string) {
  const c = await prismaImob.cliente.findUnique({ where: { id } });
  if (!c || c.imobiliariaId !== imobiliariaId) return null;
  return c;
}

// --- Imóveis --------------------------------------------------------------

export async function listarImoveis(imobiliariaId: string, filtros: ListagemImoveisInput) {
  const where: Prisma.ImovelWhereInput = { imobiliariaId };
  if (filtros.status) where.status = filtros.status;
  if (filtros.tipo) where.tipo = filtros.tipo;
  if (filtros.finalidade) where.finalidade = filtros.finalidade;
  if (filtros.busca?.trim()) {
    const q = filtros.busca.trim();
    where.OR = [
      { codigo: { contains: q, mode: "insensitive" } },
      { titulo: { contains: q, mode: "insensitive" } },
      { bairro: { contains: q, mode: "insensitive" } },
      { cidade: { contains: q, mode: "insensitive" } },
    ];
  }

  const [total, itens] = await Promise.all([
    prismaImob.imovel.count({ where }),
    prismaImob.imovel.findMany({
      where,
      orderBy: { criadoEm: "desc" },
      skip: (filtros.pagina - 1) * TAMANHO_PAGINA,
      take: TAMANHO_PAGINA,
      include: {
        fotos: { where: { principal: true }, take: 1 },
        _count: { select: { fotos: true } },
      },
    }),
  ]);

  return { itens, total, pagina: filtros.pagina, totalPaginas: Math.max(1, Math.ceil(total / TAMANHO_PAGINA)) };
}

export async function obterImovelDoTenant(imobiliariaId: string, id: string) {
  const imovel = await prismaImob.imovel.findUnique({
    where: { id },
    include: {
      fotos: { orderBy: [{ principal: "desc" }, { ordem: "asc" }] },
      proprietarios: { include: { proprietario: { select: { id: true, nome: true } } } },
    },
  });
  if (!imovel || imovel.imobiliariaId !== imobiliariaId) return null;
  return imovel;
}

// --- Dashboard (Fase 2): KPIs comerciais reais ----------------------------

export async function resumoComercial(imobiliariaId: string) {
  const [imoveis, disponiveis, negociacao, vendidos, alugados, clientes, proprietarios] = await Promise.all([
    prismaImob.imovel.count({ where: { imobiliariaId, status: { not: "INATIVO" } } }),
    prismaImob.imovel.count({ where: { imobiliariaId, status: "DISPONIVEL" } }),
    prismaImob.imovel.count({ where: { imobiliariaId, status: { in: ["RESERVADO", "EM_NEGOCIACAO"] } } }),
    prismaImob.imovel.count({ where: { imobiliariaId, status: "VENDIDO" } }),
    prismaImob.imovel.count({ where: { imobiliariaId, status: "ALUGADO" } }),
    prismaImob.cliente.count({ where: { imobiliariaId, ativo: true } }),
    prismaImob.proprietario.count({ where: { imobiliariaId, ativo: true } }),
  ]);

  // distribuição por tipo, para o gráfico do painel
  const porTipoRaw = await prismaImob.imovel.groupBy({
    by: ["tipo"],
    where: { imobiliariaId, status: { not: "INATIVO" } },
    _count: { _all: true },
  });
  const porTipo = porTipoRaw.map((r) => ({ tipo: r.tipo, total: r._count._all })).sort((a, b) => b.total - a.total);

  return { imoveis, disponiveis, negociacao, vendidos, alugados, clientes, proprietarios, porTipo };
}
