import { prismaImob } from "@/lib/imob/prisma";

/**
 * Resolvedores de nome em lote — para as entidades que referenciam
 * imóvel/cliente/proprietário/corretor por id escalar (Fases 3 e 4). Uma query
 * por tipo, sempre filtrada por tenant, evitando N+1. Compartilhado por
 * consultas-crm e consultas-fin.
 */

function unicos(ids: (string | null | undefined)[]): string[] {
  return Array.from(new Set(ids.filter((v): v is string => Boolean(v))));
}

export async function mapaImoveis(imobiliariaId: string, ids: (string | null | undefined)[]) {
  const lista = unicos(ids);
  if (lista.length === 0) return new Map<string, { codigo: string; titulo: string }>();
  const imoveis = await prismaImob.imovel.findMany({
    where: { id: { in: lista }, imobiliariaId },
    select: { id: true, codigo: true, titulo: true },
  });
  return new Map(imoveis.map((i) => [i.id, { codigo: i.codigo, titulo: i.titulo }]));
}

export async function mapaClientes(imobiliariaId: string, ids: (string | null | undefined)[]) {
  const lista = unicos(ids);
  if (lista.length === 0) return new Map<string, string>();
  const clientes = await prismaImob.cliente.findMany({
    where: { id: { in: lista }, imobiliariaId },
    select: { id: true, nome: true },
  });
  return new Map(clientes.map((c) => [c.id, c.nome]));
}

export async function mapaProprietarios(imobiliariaId: string, ids: (string | null | undefined)[]) {
  const lista = unicos(ids);
  if (lista.length === 0) return new Map<string, string>();
  const props = await prismaImob.proprietario.findMany({
    where: { id: { in: lista }, imobiliariaId },
    select: { id: true, nome: true },
  });
  return new Map(props.map((p) => [p.id, p.nome]));
}

export async function mapaCorretores(imobiliariaId: string, ids: (string | null | undefined)[]) {
  const lista = unicos(ids);
  if (lista.length === 0) return new Map<string, string>();
  const corretores = await prismaImob.corretor.findMany({
    where: { id: { in: lista }, imobiliariaId },
    select: { id: true, nome: true },
  });
  return new Map(corretores.map((c) => [c.id, c.nome]));
}
