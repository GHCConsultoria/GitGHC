import { prismaImob } from "@/lib/imob/prisma";
import { temPermissao } from "@/lib/imob/rbac";

/**
 * Busca global (Fase 6). Procura o termo em imóveis, clientes, proprietários,
 * leads e contratos — mas só nas categorias que o papel do usuário pode ver
 * (RBAC respeitado no servidor). Sempre filtrada por tenant.
 */

export interface ResultadoBusca {
  categoria: string;
  href: string;
  titulo: string;
  subtitulo: string;
}

export interface GrupoBusca {
  categoria: string;
  itens: ResultadoBusca[];
}

const LIMITE_POR_CATEGORIA = 8;

export async function buscarGlobal(
  imobiliariaId: string,
  termo: string,
  permissoes: readonly string[],
): Promise<GrupoBusca[]> {
  const q = termo.trim();
  const contains = { contains: q, mode: "insensitive" as const };
  const grupos: GrupoBusca[] = [];

  const podeImoveis = temPermissao(permissoes, "imoveis.ver");
  const podeClientes = temPermissao(permissoes, "clientes.ver");
  const podeProps = temPermissao(permissoes, "proprietarios.ver");
  const podeLeads = temPermissao(permissoes, "leads.ver");
  const podeContratos = temPermissao(permissoes, "contratos.ver");

  const [imoveis, clientes, proprietarios, leads, contratos] = await Promise.all([
    podeImoveis
      ? prismaImob.imovel.findMany({
          where: {
            imobiliariaId,
            OR: [{ codigo: contains }, { titulo: contains }, { bairro: contains }, { cidade: contains }],
          },
          take: LIMITE_POR_CATEGORIA,
          select: { id: true, codigo: true, titulo: true, cidade: true },
        })
      : Promise.resolve([]),
    podeClientes
      ? prismaImob.cliente.findMany({
          where: {
            imobiliariaId,
            OR: [{ nome: contains }, { documento: contains }, { email: contains }, { telefone: contains }],
          },
          take: LIMITE_POR_CATEGORIA,
          select: { id: true, nome: true, email: true, telefone: true },
        })
      : Promise.resolve([]),
    podeProps
      ? prismaImob.proprietario.findMany({
          where: {
            imobiliariaId,
            OR: [{ nome: contains }, { documento: contains }, { email: contains }, { telefone: contains }],
          },
          take: LIMITE_POR_CATEGORIA,
          select: { id: true, nome: true, telefone: true },
        })
      : Promise.resolve([]),
    podeLeads
      ? prismaImob.lead.findMany({
          where: { imobiliariaId, OR: [{ nome: contains }, { email: contains }, { telefone: contains }] },
          take: LIMITE_POR_CATEGORIA,
          select: { id: true, nome: true, etapa: true },
        })
      : Promise.resolve([]),
    podeContratos
      ? prismaImob.contrato.findMany({
          where: { imobiliariaId, titulo: contains },
          take: LIMITE_POR_CATEGORIA,
          select: { id: true, titulo: true, tipo: true },
        })
      : Promise.resolve([]),
  ]);

  if (imoveis.length > 0) {
    grupos.push({
      categoria: "Imóveis",
      itens: imoveis.map((i) => ({
        categoria: "Imóveis",
        href: `/imob/imoveis/${i.id}`,
        titulo: `${i.codigo} — ${i.titulo}`,
        subtitulo: i.cidade ?? "",
      })),
    });
  }
  if (clientes.length > 0) {
    grupos.push({
      categoria: "Clientes",
      itens: clientes.map((c) => ({
        categoria: "Clientes",
        href: "/imob/clientes",
        titulo: c.nome,
        subtitulo: c.email || c.telefone || "",
      })),
    });
  }
  if (proprietarios.length > 0) {
    grupos.push({
      categoria: "Proprietários",
      itens: proprietarios.map((p) => ({
        categoria: "Proprietários",
        href: "/imob/proprietarios",
        titulo: p.nome,
        subtitulo: p.telefone ?? "",
      })),
    });
  }
  if (leads.length > 0) {
    grupos.push({
      categoria: "Leads",
      itens: leads.map((l) => ({
        categoria: "Leads",
        href: `/imob/leads/${l.id}`,
        titulo: l.nome,
        subtitulo: l.etapa,
      })),
    });
  }
  if (contratos.length > 0) {
    grupos.push({
      categoria: "Contratos",
      itens: contratos.map((c) => ({
        categoria: "Contratos",
        href: `/imob/contratos/${c.id}`,
        titulo: c.titulo,
        subtitulo: c.tipo,
      })),
    });
  }

  return grupos;
}
