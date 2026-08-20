import { calcularCompatibilidade, type PreferenciasCliente } from "@/lib/imob/matching";
import { prismaImob } from "@/lib/imob/prisma";
import { mapaClientes, mapaImoveis, mapaProprietarios } from "@/lib/imob/resolvedores";
import { ETAPAS_LEAD } from "@/lib/imob/schemas";

/**
 * Consultas do CRM (Fase 3) — todas filtradas por `imobiliariaId`. Referências
 * a imóvel/cliente/proprietário são ids escalares; os nomes são resolvidos em
 * lote (src/lib/imob/resolvedores.ts) para evitar N+1.
 */

// --- Corretores -----------------------------------------------------------

export function listarCorretores(imobiliariaId: string) {
  return prismaImob.corretor.findMany({
    where: { imobiliariaId },
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
    include: { _count: { select: { leads: true, visitas: true, captacoes: true } } },
  });
}

export function listarCorretoresParaSelecao(imobiliariaId: string) {
  return prismaImob.corretor.findMany({
    where: { imobiliariaId, ativo: true },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });
}

export async function obterCorretorDoTenant(imobiliariaId: string, id: string) {
  const c = await prismaImob.corretor.findUnique({ where: { id } });
  if (!c || c.imobiliariaId !== imobiliariaId) return null;
  return c;
}

// --- Leads / Kanban -------------------------------------------------------

export interface LeadCard {
  id: string;
  nome: string;
  etapa: string;
  origem: string;
  telefone: string | null;
  valorPretendido: number | null;
  corretorNome: string | null;
  imovelCodigo: string | null;
  proximaAcao: Date | null;
}

export async function leadsAgrupadosPorEtapa(imobiliariaId: string) {
  const leads = await prismaImob.lead.findMany({
    where: { imobiliariaId },
    orderBy: [{ ordem: "asc" }, { criadoEm: "desc" }],
    include: { corretor: { select: { nome: true } } },
  });
  const imoveis = await mapaImoveis(
    imobiliariaId,
    leads.map((l) => l.imovelId),
  );

  const colunas = new Map<string, LeadCard[]>();
  for (const etapa of ETAPAS_LEAD) colunas.set(etapa, []);
  for (const l of leads) {
    colunas.get(l.etapa)?.push({
      id: l.id,
      nome: l.nome,
      etapa: l.etapa,
      origem: l.origem,
      telefone: l.telefone,
      valorPretendido: l.valorPretendido,
      corretorNome: l.corretor?.nome ?? null,
      imovelCodigo: l.imovelId ? (imoveis.get(l.imovelId)?.codigo ?? null) : null,
      proximaAcao: l.proximaAcao,
    });
  }
  return colunas;
}

export async function obterLeadDoTenant(imobiliariaId: string, id: string) {
  const lead = await prismaImob.lead.findUnique({
    where: { id },
    include: {
      corretor: { select: { id: true, nome: true } },
      interacoes: { orderBy: { criadoEm: "desc" } },
    },
  });
  if (!lead || lead.imobiliariaId !== imobiliariaId) return null;
  return lead;
}

// --- Visitas --------------------------------------------------------------

export async function listarVisitas(imobiliariaId: string, status?: string) {
  const visitas = await prismaImob.visita.findMany({
    where: { imobiliariaId, ...(status ? { status: status as never } : {}) },
    orderBy: { data: "desc" },
    include: { corretor: { select: { nome: true } } },
    take: 200,
  });
  const imoveis = await mapaImoveis(
    imobiliariaId,
    visitas.map((v) => v.imovelId),
  );
  const clientes = await mapaClientes(
    imobiliariaId,
    visitas.map((v) => v.clienteId),
  );
  return visitas.map((v) => ({
    ...v,
    imovelCodigo: imoveis.get(v.imovelId)?.codigo ?? null,
    imovelTitulo: imoveis.get(v.imovelId)?.titulo ?? null,
    clienteNome: v.clienteId ? (clientes.get(v.clienteId) ?? null) : null,
  }));
}

export async function obterVisitaDoTenant(imobiliariaId: string, id: string) {
  const v = await prismaImob.visita.findUnique({ where: { id } });
  if (!v || v.imobiliariaId !== imobiliariaId) return null;
  return v;
}

// --- Tarefas --------------------------------------------------------------

export function listarTarefas(imobiliariaId: string, status?: string) {
  return prismaImob.tarefa.findMany({
    where: { imobiliariaId, ...(status ? { status: status as never } : {}) },
    orderBy: [{ status: "asc" }, { prazo: "asc" }, { criadoEm: "desc" }],
    take: 300,
  });
}

export async function obterTarefaDoTenant(imobiliariaId: string, id: string) {
  const t = await prismaImob.tarefa.findUnique({ where: { id } });
  if (!t || t.imobiliariaId !== imobiliariaId) return null;
  return t;
}

// --- Captações ------------------------------------------------------------

export async function listarCaptacoes(imobiliariaId: string) {
  const captacoes = await prismaImob.captacao.findMany({
    where: { imobiliariaId },
    orderBy: { criadoEm: "desc" },
    include: { corretor: { select: { nome: true } } },
  });
  const imoveis = await mapaImoveis(
    imobiliariaId,
    captacoes.map((c) => c.imovelId),
  );
  const props = await mapaProprietarios(
    imobiliariaId,
    captacoes.map((c) => c.proprietarioId),
  );
  return captacoes.map((c) => ({
    ...c,
    imovelCodigo: c.imovelId ? (imoveis.get(c.imovelId)?.codigo ?? null) : null,
    proprietarioNome: c.proprietarioId ? (props.get(c.proprietarioId) ?? null) : null,
  }));
}

export async function obterCaptacaoDoTenant(imobiliariaId: string, id: string) {
  const c = await prismaImob.captacao.findUnique({ where: { id } });
  if (!c || c.imobiliariaId !== imobiliariaId) return null;
  return c;
}

// --- Matching cliente×imóvel ---------------------------------------------

export interface ImovelCompativel {
  id: string;
  codigo: string;
  titulo: string;
  tipo: string;
  finalidade: string;
  cidade: string | null;
  precoVenda: number | null;
  precoAluguel: number | null;
  score: number;
}

/**
 * Imóveis compatíveis com o perfil do cliente, ordenados por score. Considera
 * só imóveis não inativos do tenant. Retorna também quantos passam de 80%.
 */
export async function imoveisCompativeis(imobiliariaId: string, clienteId: string) {
  const cliente = await prismaImob.cliente.findUnique({ where: { id: clienteId } });
  if (!cliente || cliente.imobiliariaId !== imobiliariaId) return null;

  const pref: PreferenciasCliente = {
    prefTipoImovel: cliente.prefTipoImovel,
    prefFinalidade: cliente.prefFinalidade,
    prefValorMin: cliente.prefValorMin,
    prefValorMax: cliente.prefValorMax,
    prefCidade: cliente.prefCidade,
    prefQuartos: cliente.prefQuartos,
    prefVagas: cliente.prefVagas,
    prefAreaMinima: cliente.prefAreaMinima,
  };

  const imoveis = await prismaImob.imovel.findMany({
    where: { imobiliariaId, status: { not: "INATIVO" } },
    select: {
      id: true,
      codigo: true,
      titulo: true,
      tipo: true,
      finalidade: true,
      cidade: true,
      precoVenda: true,
      precoAluguel: true,
      quartos: true,
      vagas: true,
      areaTotal: true,
    },
  });

  const compativeis: ImovelCompativel[] = imoveis
    .map((im) => {
      const { score } = calcularCompatibilidade(pref, {
        tipo: im.tipo,
        finalidade: im.finalidade,
        precoVenda: im.precoVenda,
        precoAluguel: im.precoAluguel,
        cidade: im.cidade,
        quartos: im.quartos,
        vagas: im.vagas,
        areaTotal: im.areaTotal,
      });
      return {
        id: im.id,
        codigo: im.codigo,
        titulo: im.titulo,
        tipo: im.tipo,
        finalidade: im.finalidade,
        cidade: im.cidade,
        precoVenda: im.precoVenda,
        precoAluguel: im.precoAluguel,
        score,
      };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);

  return {
    cliente: { id: cliente.id, nome: cliente.nome, temPreferencias: temAlgumaPreferencia(pref) },
    compativeis,
    acima80: compativeis.filter((c) => c.score >= 80).length,
  };
}

function temAlgumaPreferencia(pref: PreferenciasCliente): boolean {
  return Object.values(pref).some((v) => v !== null && v !== "");
}

// --- Agenda (agregação de visitas, tarefas e próximas ações de lead) ------

export interface EventoAgenda {
  tipo: "VISITA" | "TAREFA" | "LEAD";
  data: Date;
  titulo: string;
  detalhe: string;
  href: string;
}

export async function agenda(imobiliariaId: string, inicio: Date, fim: Date): Promise<EventoAgenda[]> {
  const [visitas, tarefas, leads] = await Promise.all([
    prismaImob.visita.findMany({
      where: { imobiliariaId, data: { gte: inicio, lte: fim } },
      include: { corretor: { select: { nome: true } } },
    }),
    prismaImob.tarefa.findMany({
      where: { imobiliariaId, prazo: { gte: inicio, lte: fim }, status: "PENDENTE" },
    }),
    prismaImob.lead.findMany({
      where: { imobiliariaId, proximaAcao: { gte: inicio, lte: fim } },
      select: { id: true, nome: true, proximaAcao: true },
    }),
  ]);

  const imoveis = await mapaImoveis(
    imobiliariaId,
    visitas.map((v) => v.imovelId),
  );

  const eventos: EventoAgenda[] = [
    ...visitas.map((v) => ({
      tipo: "VISITA" as const,
      data: v.data,
      titulo: `Visita — ${imoveis.get(v.imovelId)?.codigo ?? "imóvel"}`,
      detalhe: v.corretor?.nome ?? "",
      href: `/imob/visitas`,
    })),
    ...tarefas.map((t) => ({
      tipo: "TAREFA" as const,
      data: t.prazo as Date,
      titulo: t.titulo,
      detalhe: t.prioridade,
      href: `/imob/tarefas`,
    })),
    ...leads.map((l) => ({
      tipo: "LEAD" as const,
      data: l.proximaAcao as Date,
      titulo: `Follow-up — ${l.nome}`,
      detalhe: "Próxima ação do lead",
      href: `/imob/leads`,
    })),
  ];

  return eventos.sort((a, b) => a.data.getTime() - b.data.getTime());
}
