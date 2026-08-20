import { calcularAlertaVencimento } from "@/lib/imob/alertas";
import { prismaImob } from "@/lib/imob/prisma";
import { mapaClientes, mapaCorretores, mapaImoveis, mapaProprietarios } from "@/lib/imob/resolvedores";

/**
 * Consultas de Propostas/Vendas/Locações/Contratos (Fase 4) — todas filtradas
 * por `imobiliariaId`. Nomes resolvidos em lote (resolvedores.ts).
 */

// --- Propostas ------------------------------------------------------------

export async function listarPropostas(imobiliariaId: string, status?: string) {
  const propostas = await prismaImob.proposta.findMany({
    where: { imobiliariaId, ...(status ? { status: status as never } : {}) },
    orderBy: { data: "desc" },
    take: 200,
  });
  const imoveis = await mapaImoveis(
    imobiliariaId,
    propostas.map((p) => p.imovelId),
  );
  const clientes = await mapaClientes(
    imobiliariaId,
    propostas.map((p) => p.clienteId),
  );
  return propostas.map((p) => ({
    ...p,
    imovelCodigo: imoveis.get(p.imovelId)?.codigo ?? null,
    clienteNome: p.clienteId ? (clientes.get(p.clienteId) ?? null) : null,
  }));
}

export async function obterPropostaDoTenant(imobiliariaId: string, id: string) {
  const p = await prismaImob.proposta.findUnique({
    where: { id },
    include: { historico: { orderBy: { criadoEm: "desc" } } },
  });
  if (!p || p.imobiliariaId !== imobiliariaId) return null;
  return p;
}

// --- Vendas ---------------------------------------------------------------

export async function listarVendas(imobiliariaId: string) {
  const vendas = await prismaImob.venda.findMany({
    where: { imobiliariaId },
    orderBy: { data: "desc" },
    take: 200,
  });
  const imoveis = await mapaImoveis(
    imobiliariaId,
    vendas.map((v) => v.imovelId),
  );
  const clientes = await mapaClientes(
    imobiliariaId,
    vendas.map((v) => v.clienteId),
  );
  const corretores = await mapaCorretores(
    imobiliariaId,
    vendas.map((v) => v.corretorId),
  );
  return vendas.map((v) => ({
    ...v,
    imovelCodigo: imoveis.get(v.imovelId)?.codigo ?? null,
    clienteNome: v.clienteId ? (clientes.get(v.clienteId) ?? null) : null,
    corretorNome: v.corretorId ? (corretores.get(v.corretorId) ?? null) : null,
  }));
}

export async function obterVendaDoTenant(imobiliariaId: string, id: string) {
  const v = await prismaImob.venda.findUnique({ where: { id } });
  if (!v || v.imobiliariaId !== imobiliariaId) return null;
  return v;
}

// --- Locações -------------------------------------------------------------

export async function listarLocacoes(imobiliariaId: string, status?: string) {
  const locacoes = await prismaImob.locacao.findMany({
    where: { imobiliariaId, ...(status ? { status: status as never } : {}) },
    orderBy: { criadoEm: "desc" },
    take: 200,
  });
  const imoveis = await mapaImoveis(
    imobiliariaId,
    locacoes.map((l) => l.imovelId),
  );
  const clientes = await mapaClientes(
    imobiliariaId,
    locacoes.map((l) => l.locatarioId),
  );
  const props = await mapaProprietarios(
    imobiliariaId,
    locacoes.map((l) => l.proprietarioId),
  );
  return locacoes.map((l) => ({
    ...l,
    imovelCodigo: imoveis.get(l.imovelId)?.codigo ?? null,
    locatarioNome: l.locatarioId ? (clientes.get(l.locatarioId) ?? null) : null,
    proprietarioNome: l.proprietarioId ? (props.get(l.proprietarioId) ?? null) : null,
  }));
}

export async function obterLocacaoDoTenant(imobiliariaId: string, id: string) {
  const l = await prismaImob.locacao.findUnique({ where: { id } });
  if (!l || l.imobiliariaId !== imobiliariaId) return null;
  return l;
}

// --- Contratos + alertas de vencimento ------------------------------------

export async function listarContratos(imobiliariaId: string) {
  const contratos = await prismaImob.contrato.findMany({
    where: { imobiliariaId },
    orderBy: [{ status: "asc" }, { dataFim: "asc" }],
    include: { _count: { select: { documentos: true } } },
    take: 300,
  });
  return contratos.map((c) => ({
    ...c,
    alerta: c.dataFim && c.status === "ATIVO" ? calcularAlertaVencimento(c.dataFim) : null,
  }));
}

export async function obterContratoDoTenant(imobiliariaId: string, id: string) {
  const c = await prismaImob.contrato.findUnique({
    where: { id },
    include: { documentos: { orderBy: { criadoEm: "desc" } } },
  });
  if (!c || c.imobiliariaId !== imobiliariaId) return null;
  return c;
}

/**
 * Contratos ativos que vencem dentro de `dias` (ou já vencidos) — alimenta o
 * painel de alertas de vencimento. Ordenados do mais urgente ao menos.
 */
export async function contratosVencendo(imobiliariaId: string, dias = 30) {
  const limite = new Date();
  limite.setDate(limite.getDate() + dias);
  const contratos = await prismaImob.contrato.findMany({
    where: { imobiliariaId, status: "ATIVO", dataFim: { not: null, lte: limite } },
    orderBy: { dataFim: "asc" },
  });
  return contratos
    .filter((c) => c.dataFim !== null)
    .map((c) => ({ ...c, alerta: calcularAlertaVencimento(c.dataFim as Date) }));
}

// --- Dashboard (Fase 4): totais do mês ------------------------------------

export async function resumoFinanceiro(imobiliariaId: string) {
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const [vendasMes, locacoesAtivas, propostasAbertas, contratosVencendo30] = await Promise.all([
    prismaImob.venda.aggregate({
      where: { imobiliariaId, data: { gte: inicioMes } },
      _sum: { valorVenda: true },
      _count: { _all: true },
    }),
    prismaImob.locacao.count({ where: { imobiliariaId, status: "ATIVO" } }),
    prismaImob.proposta.count({ where: { imobiliariaId, status: { in: ["ENVIADA", "EM_ANALISE"] } } }),
    contratosVencendo(imobiliariaId, 30),
  ]);

  return {
    valorVendidoMes: vendasMes._sum.valorVenda ?? 0,
    qtdVendasMes: vendasMes._count._all,
    locacoesAtivas,
    propostasAbertas,
    contratosVencendo: contratosVencendo30.length,
  };
}

/** Contratos para selects de vínculo (documentos). */
export function listarContratosParaSelecao(imobiliariaId: string) {
  return prismaImob.contrato.findMany({
    where: { imobiliariaId },
    orderBy: { criadoEm: "desc" },
    select: { id: true, titulo: true },
    take: 100,
  });
}
