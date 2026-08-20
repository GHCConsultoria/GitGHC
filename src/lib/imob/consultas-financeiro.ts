import { fluxoPorMes, type LancamentoFluxo, resumoFluxoCaixa } from "@/lib/imob/fluxo";
import { prismaImob } from "@/lib/imob/prisma";
import { mapaClientes, mapaCorretores, mapaImoveis } from "@/lib/imob/resolvedores";

/**
 * Consultas do Financeiro/Comissões (Fase 5) — todas filtradas por
 * `imobiliariaId`. Nomes resolvidos em lote (resolvedores.ts).
 */

// --- Lançamentos (contas a pagar/receber) ---------------------------------

export async function listarLancamentos(imobiliariaId: string, filtros: { tipo?: string; status?: string } = {}) {
  const lancamentos = await prismaImob.lancamentoFinanceiro.findMany({
    where: {
      imobiliariaId,
      ...(filtros.tipo ? { tipo: filtros.tipo as never } : {}),
      ...(filtros.status ? { status: filtros.status as never } : {}),
    },
    orderBy: [{ status: "asc" }, { vencimento: "asc" }],
    take: 300,
  });
  const imoveis = await mapaImoveis(
    imobiliariaId,
    lancamentos.map((l) => l.imovelId),
  );
  const clientes = await mapaClientes(
    imobiliariaId,
    lancamentos.map((l) => l.clienteId),
  );
  const hoje = new Date();
  return lancamentos.map((l) => ({
    ...l,
    imovelCodigo: l.imovelId ? (imoveis.get(l.imovelId)?.codigo ?? null) : null,
    clienteNome: l.clienteId ? (clientes.get(l.clienteId) ?? null) : null,
    vencido: l.status === "PENDENTE" && l.vencimento < hoje,
  }));
}

export async function obterLancamentoDoTenant(imobiliariaId: string, id: string) {
  const l = await prismaImob.lancamentoFinanceiro.findUnique({ where: { id } });
  if (!l || l.imobiliariaId !== imobiliariaId) return null;
  return l;
}

/** Consolida o fluxo de caixa do tenant (regime de caixa). */
export async function fluxoDeCaixaTenant(imobiliariaId: string, saldoInicial = 0) {
  const lancamentos = await prismaImob.lancamentoFinanceiro.findMany({
    where: { imobiliariaId },
    select: { tipo: true, status: true, valor: true, pagamentoEm: true },
  });
  const dados = lancamentos as LancamentoFluxo[];
  return {
    resumo: resumoFluxoCaixa(dados, saldoInicial),
    porMes: fluxoPorMes(dados),
  };
}

// --- Comissões ------------------------------------------------------------

export async function listarComissoes(imobiliariaId: string, status?: string) {
  const comissoes = await prismaImob.comissao.findMany({
    where: { imobiliariaId, ...(status ? { status: status as never } : {}) },
    orderBy: [{ status: "asc" }, { criadoEm: "desc" }],
    take: 300,
  });
  const corretores = await mapaCorretores(
    imobiliariaId,
    comissoes.map((c) => c.corretorId),
  );
  return comissoes.map((c) => ({
    ...c,
    corretorNome: c.corretorId ? (corretores.get(c.corretorId) ?? null) : null,
  }));
}

export async function obterComissaoDoTenant(imobiliariaId: string, id: string) {
  const c = await prismaImob.comissao.findUnique({ where: { id } });
  if (!c || c.imobiliariaId !== imobiliariaId) return null;
  return c;
}

export async function resumoComissoes(imobiliariaId: string) {
  const [previstas, aprovadas, pagas] = await Promise.all([
    prismaImob.comissao.aggregate({ where: { imobiliariaId, status: "PREVISTA" }, _sum: { valorPrevisto: true } }),
    prismaImob.comissao.aggregate({ where: { imobiliariaId, status: "APROVADA" }, _sum: { valorAprovado: true } }),
    prismaImob.comissao.aggregate({ where: { imobiliariaId, status: "PAGA" }, _sum: { valorPago: true } }),
  ]);
  return {
    prevista: previstas._sum.valorPrevisto ?? 0,
    aprovada: aprovadas._sum.valorAprovado ?? 0,
    paga: pagas._sum.valorPago ?? 0,
  };
}

/** Vendas para o seletor de "gerar comissões" (código + valor). */
export function listarVendasParaComissao(imobiliariaId: string) {
  return prismaImob.venda.findMany({
    where: { imobiliariaId },
    orderBy: { data: "desc" },
    select: { id: true, valorVenda: true, imovelId: true },
    take: 100,
  });
}
