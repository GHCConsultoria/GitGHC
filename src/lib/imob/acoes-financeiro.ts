"use server";

import { revalidatePath } from "next/cache";
import { registrarAuditoria } from "@/lib/imob/auditoria";
import { obterSessaoImob, type SessaoImob } from "@/lib/imob/auth";
import { calcularComissao } from "@/lib/imob/comissao";
import { obterComissaoDoTenant, obterLancamentoDoTenant } from "@/lib/imob/consultas-financeiro";
import { prismaImob } from "@/lib/imob/prisma";
import { exigirPermissao } from "@/lib/imob/rbac";
import { paraMensagem, type ResultadoAcao } from "@/lib/imob/resultado";
import {
  comissaoSchema,
  gerarComissoesSchema,
  lancamentoSchema,
  marcarPagoSchema,
  mudarStatusComissaoSchema,
} from "@/lib/imob/schemas";

function ouNulo<T>(v: T | "" | undefined | null): T | null {
  return v === "" || v === undefined || v === null ? null : v;
}
function dataOuNulo(v: unknown): Date | null {
  return v instanceof Date ? v : null;
}

async function pertence(
  imobiliariaId: string,
  modelo: "imovel" | "cliente" | "corretor" | "contrato" | "venda",
  id: string | null | undefined,
): Promise<string | null> {
  if (!id) return null;
  const delegate = prismaImob[modelo] as { findFirst: (a: unknown) => Promise<{ id: string } | null> };
  const achado = await delegate.findFirst({ where: { id, imobiliariaId }, select: { id: true } });
  return achado?.id ?? null;
}

async function auditar(
  sessao: SessaoImob,
  entidade: string,
  entidadeId: string,
  acao: string,
  valorNovo?: Record<string, string | number | boolean | null>,
) {
  await registrarAuditoria({
    imobiliariaId: sessao.imobiliariaId,
    usuarioId: sessao.id,
    entidade,
    entidadeId,
    acao,
    valorNovo: valorNovo ?? undefined,
  });
}

// ===========================================================================
// Lançamentos (contas a pagar/receber)
// ===========================================================================

function lerLancamento(formData: FormData) {
  return lancamentoSchema.safeParse({
    tipo: formData.get("tipo"),
    descricao: formData.get("descricao"),
    categoria: formData.get("categoria") || undefined,
    valor: formData.get("valor"),
    vencimento: formData.get("vencimento"),
    formaPagamento: formData.get("formaPagamento") || undefined,
    centroCusto: formData.get("centroCusto") || undefined,
    clienteId: formData.get("clienteId") || undefined,
    imovelId: formData.get("imovelId") || undefined,
    contratoId: formData.get("contratoId") || undefined,
    corretorId: formData.get("corretorId") || undefined,
  });
}

async function dadosLancamento(imobiliariaId: string, d: ReturnType<typeof lancamentoSchema.parse>) {
  return {
    tipo: d.tipo,
    descricao: d.descricao,
    categoria: ouNulo(d.categoria),
    valor: d.valor,
    vencimento: d.vencimento,
    formaPagamento: ouNulo(d.formaPagamento),
    centroCusto: ouNulo(d.centroCusto),
    clienteId: await pertence(imobiliariaId, "cliente", d.clienteId),
    imovelId: await pertence(imobiliariaId, "imovel", d.imovelId),
    contratoId: await pertence(imobiliariaId, "contrato", d.contratoId),
    corretorId: await pertence(imobiliariaId, "corretor", d.corretorId),
  };
}

export async function criarLancamento(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "financeiro.criar");
    const parsed = lerLancamento(formData);
    if (!parsed.success) return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "dados inválidos" };
    const criado = await prismaImob.lancamentoFinanceiro.create({
      data: { imobiliariaId: sessao.imobiliariaId, ...(await dadosLancamento(sessao.imobiliariaId, parsed.data)) },
    });
    await auditar(sessao, "LancamentoFinanceiro", criado.id, "criar", { tipo: criado.tipo, valor: criado.valor });
    revalidatePath("/imob/financeiro");
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível criar o lançamento") };
  }
}

export async function editarLancamento(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "financeiro.editar");
    const id = String(formData.get("id") ?? "");
    const alvo = await obterLancamentoDoTenant(sessao.imobiliariaId, id);
    if (!alvo) return { sucesso: false, erro: "lançamento não encontrado" };
    const parsed = lerLancamento(formData);
    if (!parsed.success) return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "dados inválidos" };
    await prismaImob.lancamentoFinanceiro.update({
      where: { id: alvo.id },
      data: await dadosLancamento(sessao.imobiliariaId, parsed.data),
    });
    await auditar(sessao, "LancamentoFinanceiro", alvo.id, "editar");
    revalidatePath("/imob/financeiro");
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível editar o lançamento") };
  }
}

export async function marcarLancamentoPago(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "financeiro.editar");
    const parsed = marcarPagoSchema.safeParse({
      lancamentoId: formData.get("lancamentoId"),
      pagamentoEm: formData.get("pagamentoEm") || undefined,
    });
    if (!parsed.success) return { sucesso: false, erro: "dados inválidos" };
    const alvo = await obterLancamentoDoTenant(sessao.imobiliariaId, parsed.data.lancamentoId);
    if (!alvo) return { sucesso: false, erro: "lançamento não encontrado" };
    // alterna entre pago e pendente
    const pagando = alvo.status !== "PAGO";
    await prismaImob.lancamentoFinanceiro.update({
      where: { id: alvo.id },
      data: {
        status: pagando ? "PAGO" : "PENDENTE",
        pagamentoEm: pagando ? (dataOuNulo(parsed.data.pagamentoEm) ?? new Date()) : null,
      },
    });
    await auditar(sessao, "LancamentoFinanceiro", alvo.id, pagando ? "marcar-pago" : "reabrir");
    revalidatePath("/imob/financeiro");
    revalidatePath("/imob/fluxo-caixa");
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível atualizar o lançamento") };
  }
}

// ===========================================================================
// Comissões
// ===========================================================================

export async function criarComissao(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "comissoes.criar");
    const parsed = comissaoSchema.safeParse({
      corretorId: formData.get("corretorId") || undefined,
      vendaId: formData.get("vendaId") || undefined,
      tipo: formData.get("tipo") || "CORRETOR_VENDEDOR",
      descricao: formData.get("descricao") || undefined,
      percentual: formData.get("percentual") || undefined,
      valorPrevisto: formData.get("valorPrevisto"),
    });
    if (!parsed.success) return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "dados inválidos" };
    const d = parsed.data;
    const criada = await prismaImob.comissao.create({
      data: {
        imobiliariaId: sessao.imobiliariaId,
        corretorId: await pertence(sessao.imobiliariaId, "corretor", d.corretorId),
        vendaId: await pertence(sessao.imobiliariaId, "venda", d.vendaId),
        tipo: d.tipo,
        descricao: ouNulo(d.descricao),
        percentual: typeof d.percentual === "number" ? d.percentual : null,
        valorPrevisto: d.valorPrevisto,
      },
    });
    await auditar(sessao, "Comissao", criada.id, "criar", { valor: criada.valorPrevisto });
    revalidatePath("/imob/comissoes");
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível criar a comissão") };
  }
}

/**
 * Gera as comissões de uma venda aplicando a distribuição de percentuais. Usa
 * a função pura calcularComissao (centavos exatos) e cria uma Comissao por
 * papel com valor > 0.
 */
export async function gerarComissoesDaVenda(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "comissoes.criar");
    const parsed = gerarComissoesSchema.safeParse({
      vendaId: formData.get("vendaId"),
      percentualTotal: formData.get("percentualTotal"),
      pctCorretorVendedor: formData.get("pctCorretorVendedor") ?? 50,
      pctCorretorCaptador: formData.get("pctCorretorCaptador") ?? 0,
      pctGerente: formData.get("pctGerente") ?? 0,
      pctImobiliaria: formData.get("pctImobiliaria") ?? 50,
    });
    if (!parsed.success) return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "dados inválidos" };
    const d = parsed.data;

    const venda = await prismaImob.venda.findFirst({
      where: { id: d.vendaId, imobiliariaId: sessao.imobiliariaId },
      select: { id: true, valorVenda: true, corretorId: true },
    });
    if (!venda) return { sucesso: false, erro: "venda não encontrada" };

    let resultado: ReturnType<typeof calcularComissao>;
    try {
      resultado = calcularComissao(venda.valorVenda, d.percentualTotal, {
        corretorVendedor: d.pctCorretorVendedor,
        corretorCaptador: d.pctCorretorCaptador,
        gerente: d.pctGerente,
        imobiliaria: d.pctImobiliaria,
      });
    } catch {
      return { sucesso: false, erro: "os percentuais de distribuição devem somar 100%" };
    }

    const linhas = [
      { tipo: "CORRETOR_VENDEDOR" as const, valor: resultado.partes.corretorVendedor, corretorId: venda.corretorId },
      { tipo: "CORRETOR_CAPTADOR" as const, valor: resultado.partes.corretorCaptador, corretorId: null },
      { tipo: "GERENTE" as const, valor: resultado.partes.gerente, corretorId: null },
      { tipo: "IMOBILIARIA" as const, valor: resultado.partes.imobiliaria, corretorId: null },
    ].filter((l) => l.valor > 0);

    await prismaImob.$transaction(
      linhas.map((l) =>
        prismaImob.comissao.create({
          data: {
            imobiliariaId: sessao.imobiliariaId,
            vendaId: venda.id,
            corretorId: l.corretorId,
            tipo: l.tipo,
            percentual: d.percentualTotal,
            valorPrevisto: l.valor,
          },
        }),
      ),
    );
    await auditar(sessao, "Venda", venda.id, "gerar-comissoes", { total: resultado.comissaoTotal });
    revalidatePath("/imob/comissoes");
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível gerar as comissões") };
  }
}

export async function mudarStatusComissao(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "comissoes.editar");
    const parsed = mudarStatusComissaoSchema.safeParse({
      comissaoId: formData.get("comissaoId"),
      status: formData.get("status"),
    });
    if (!parsed.success) return { sucesso: false, erro: "status inválido" };
    const alvo = await obterComissaoDoTenant(sessao.imobiliariaId, parsed.data.comissaoId);
    if (!alvo) return { sucesso: false, erro: "comissão não encontrada" };

    // ao aprovar, fixa o valor aprovado; ao pagar, fixa o valor pago e a data
    const dados: {
      status: "PREVISTA" | "APROVADA" | "PAGA" | "CANCELADA";
      valorAprovado?: number;
      valorPago?: number;
      pagoEm?: Date | null;
    } = { status: parsed.data.status };
    if (parsed.data.status === "APROVADA") dados.valorAprovado = alvo.valorAprovado ?? alvo.valorPrevisto;
    if (parsed.data.status === "PAGA") {
      dados.valorAprovado = alvo.valorAprovado ?? alvo.valorPrevisto;
      dados.valorPago = alvo.valorAprovado ?? alvo.valorPrevisto;
      dados.pagoEm = new Date();
    }
    await prismaImob.comissao.update({ where: { id: alvo.id }, data: dados });
    await auditar(sessao, "Comissao", alvo.id, "mudar-status", { de: alvo.status, para: parsed.data.status });
    revalidatePath("/imob/comissoes");
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível atualizar a comissão") };
  }
}
