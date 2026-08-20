"use server";

import { revalidatePath } from "next/cache";
import { registrarAuditoria } from "@/lib/imob/auditoria";
import { obterSessaoImob, type SessaoImob } from "@/lib/imob/auth";
import { obterContratoDoTenant, obterLocacaoDoTenant, obterPropostaDoTenant } from "@/lib/imob/consultas-fin";
import { prismaImob } from "@/lib/imob/prisma";
import { exigirPermissao } from "@/lib/imob/rbac";
import { paraMensagem, type ResultadoAcao } from "@/lib/imob/resultado";
import {
  contratoSchema,
  documentoContratoSchema,
  locacaoSchema,
  mudarStatusPropostaSchema,
  propostaSchema,
  vendaSchema,
} from "@/lib/imob/schemas";
import { urlDeImagemValida } from "@/lib/imob/storage";

function ouNulo<T>(v: T | "" | undefined | null): T | null {
  return v === "" || v === undefined || v === null ? null : v;
}
function dataOuNulo(v: unknown): Date | null {
  return v instanceof Date ? v : null;
}

async function pertence(
  imobiliariaId: string,
  modelo: "imovel" | "cliente" | "corretor" | "proprietario" | "proposta",
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
// Propostas
// ===========================================================================

function lerProposta(formData: FormData) {
  return propostaSchema.safeParse({
    imovelId: formData.get("imovelId"),
    clienteId: formData.get("clienteId") || undefined,
    corretorId: formData.get("corretorId") || undefined,
    valorProposto: formData.get("valorProposto"),
    valorSolicitado: formData.get("valorSolicitado") || undefined,
    formaPagamento: formData.get("formaPagamento") || undefined,
    entrada: formData.get("entrada") || undefined,
    financiamento: formData.get("financiamento") === "on",
    permuta: formData.get("permuta") === "on",
    validade: formData.get("validade") || undefined,
    observacoes: formData.get("observacoes") || undefined,
  });
}

export async function criarProposta(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "propostas.criar");
    const parsed = lerProposta(formData);
    if (!parsed.success) return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "dados inválidos" };
    const d = parsed.data;
    const imovelId = await pertence(sessao.imobiliariaId, "imovel", d.imovelId);
    if (!imovelId) return { sucesso: false, erro: "imóvel inválido" };

    const criada = await prismaImob.$transaction(async (tx) => {
      const proposta = await tx.proposta.create({
        data: {
          imobiliariaId: sessao.imobiliariaId,
          imovelId,
          clienteId: await pertence(sessao.imobiliariaId, "cliente", d.clienteId),
          corretorId: await pertence(sessao.imobiliariaId, "corretor", d.corretorId),
          valorProposto: d.valorProposto,
          valorSolicitado: d.valorSolicitado ?? null,
          formaPagamento: ouNulo(d.formaPagamento),
          entrada: d.entrada ?? null,
          financiamento: d.financiamento ?? false,
          permuta: d.permuta ?? false,
          validade: dataOuNulo(d.validade),
          observacoes: ouNulo(d.observacoes),
        },
      });
      await tx.propostaHistorico.create({
        data: {
          propostaId: proposta.id,
          statusNovo: proposta.status,
          autorId: sessao.id,
          observacao: "Proposta criada",
        },
      });
      return proposta;
    });

    await auditar(sessao, "Proposta", criada.id, "criar", { valor: criada.valorProposto });
    revalidatePath("/imob/propostas");
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível criar a proposta") };
  }
}

export async function editarProposta(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "propostas.editar");
    const id = String(formData.get("id") ?? "");
    const alvo = await obterPropostaDoTenant(sessao.imobiliariaId, id);
    if (!alvo) return { sucesso: false, erro: "proposta não encontrada" };
    const parsed = lerProposta(formData);
    if (!parsed.success) return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "dados inválidos" };
    const d = parsed.data;
    const imovelId = await pertence(sessao.imobiliariaId, "imovel", d.imovelId);
    if (!imovelId) return { sucesso: false, erro: "imóvel inválido" };

    await prismaImob.proposta.update({
      where: { id: alvo.id },
      data: {
        imovelId,
        clienteId: await pertence(sessao.imobiliariaId, "cliente", d.clienteId),
        corretorId: await pertence(sessao.imobiliariaId, "corretor", d.corretorId),
        valorProposto: d.valorProposto,
        valorSolicitado: d.valorSolicitado ?? null,
        formaPagamento: ouNulo(d.formaPagamento),
        entrada: d.entrada ?? null,
        financiamento: d.financiamento ?? false,
        permuta: d.permuta ?? false,
        validade: dataOuNulo(d.validade),
        observacoes: ouNulo(d.observacoes),
      },
    });
    await auditar(sessao, "Proposta", alvo.id, "editar");
    revalidatePath("/imob/propostas");
    revalidatePath(`/imob/propostas/${alvo.id}`);
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível editar a proposta") };
  }
}

export async function mudarStatusProposta(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "propostas.editar");
    const parsed = mudarStatusPropostaSchema.safeParse({
      propostaId: formData.get("propostaId"),
      status: formData.get("status"),
      observacao: formData.get("observacao") || undefined,
    });
    if (!parsed.success) return { sucesso: false, erro: "status inválido" };
    const alvo = await obterPropostaDoTenant(sessao.imobiliariaId, parsed.data.propostaId);
    if (!alvo) return { sucesso: false, erro: "proposta não encontrada" };
    if (alvo.status === parsed.data.status) return { sucesso: true };

    await prismaImob.$transaction([
      prismaImob.proposta.update({ where: { id: alvo.id }, data: { status: parsed.data.status } }),
      prismaImob.propostaHistorico.create({
        data: {
          propostaId: alvo.id,
          statusAnterior: alvo.status,
          statusNovo: parsed.data.status,
          observacao: parsed.data.observacao ?? null,
          autorId: sessao.id,
        },
      }),
    ]);
    await auditar(sessao, "Proposta", alvo.id, "mudar-status", { de: alvo.status, para: parsed.data.status });
    revalidatePath("/imob/propostas");
    revalidatePath(`/imob/propostas/${alvo.id}`);
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível mudar o status") };
  }
}

// ===========================================================================
// Vendas
// ===========================================================================

export async function criarVenda(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "vendas.criar");
    const parsed = vendaSchema.safeParse({
      imovelId: formData.get("imovelId"),
      clienteId: formData.get("clienteId") || undefined,
      proprietarioId: formData.get("proprietarioId") || undefined,
      corretorId: formData.get("corretorId") || undefined,
      propostaId: formData.get("propostaId") || undefined,
      valorVenda: formData.get("valorVenda"),
      data: formData.get("data") || undefined,
      formaPagamento: formData.get("formaPagamento") || undefined,
      financiamento: formData.get("financiamento") === "on",
      comissaoValor: formData.get("comissaoValor") || undefined,
      observacoes: formData.get("observacoes") || undefined,
    });
    if (!parsed.success) return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "dados inválidos" };
    const d = parsed.data;
    const imovelId = await pertence(sessao.imobiliariaId, "imovel", d.imovelId);
    if (!imovelId) return { sucesso: false, erro: "imóvel inválido" };

    await prismaImob.$transaction(async (tx) => {
      const venda = await tx.venda.create({
        data: {
          imobiliariaId: sessao.imobiliariaId,
          imovelId,
          clienteId: await pertence(sessao.imobiliariaId, "cliente", d.clienteId),
          proprietarioId: await pertence(sessao.imobiliariaId, "proprietario", d.proprietarioId),
          corretorId: await pertence(sessao.imobiliariaId, "corretor", d.corretorId),
          propostaId: await pertence(sessao.imobiliariaId, "proposta", d.propostaId),
          valorVenda: d.valorVenda,
          data: dataOuNulo(d.data) ?? new Date(),
          formaPagamento: ouNulo(d.formaPagamento),
          financiamento: d.financiamento ?? false,
          comissaoValor: d.comissaoValor ?? null,
          observacoes: ouNulo(d.observacoes),
        },
      });
      // fecha o ciclo: marca o imóvel como VENDIDO
      await tx.imovel.update({ where: { id: imovelId }, data: { status: "VENDIDO" } });
      await registrarAuditoria(
        {
          imobiliariaId: sessao.imobiliariaId,
          usuarioId: sessao.id,
          entidade: "Venda",
          entidadeId: venda.id,
          acao: "criar",
          valorNovo: { valor: venda.valorVenda },
        },
        tx,
      );
    });

    revalidatePath("/imob/vendas");
    revalidatePath("/imob/imoveis");
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível registrar a venda") };
  }
}

// ===========================================================================
// Locações
// ===========================================================================

function lerLocacao(formData: FormData) {
  return locacaoSchema.safeParse({
    imovelId: formData.get("imovelId"),
    proprietarioId: formData.get("proprietarioId") || undefined,
    locatarioId: formData.get("locatarioId") || undefined,
    corretorId: formData.get("corretorId") || undefined,
    fiadorNome: formData.get("fiadorNome") || undefined,
    valorAluguel: formData.get("valorAluguel"),
    condominio: formData.get("condominio") || undefined,
    iptu: formData.get("iptu") || undefined,
    seguro: formData.get("seguro") || undefined,
    caucao: formData.get("caucao") || undefined,
    dataInicial: formData.get("dataInicial"),
    dataFinal: formData.get("dataFinal") || undefined,
    diaVencimento: formData.get("diaVencimento") || undefined,
    indiceReajuste: formData.get("indiceReajuste") || undefined,
    status: formData.get("status") || "ATIVO",
  });
}

async function dadosLocacao(imobiliariaId: string, d: ReturnType<typeof locacaoSchema.parse>, imovelId: string) {
  return {
    imovelId,
    proprietarioId: await pertence(imobiliariaId, "proprietario", d.proprietarioId),
    locatarioId: await pertence(imobiliariaId, "cliente", d.locatarioId),
    corretorId: await pertence(imobiliariaId, "corretor", d.corretorId),
    fiadorNome: ouNulo(d.fiadorNome),
    valorAluguel: d.valorAluguel,
    condominio: d.condominio ?? null,
    iptu: d.iptu ?? null,
    seguro: d.seguro ?? null,
    caucao: d.caucao ?? null,
    dataInicial: d.dataInicial,
    dataFinal: dataOuNulo(d.dataFinal),
    diaVencimento: typeof d.diaVencimento === "number" ? d.diaVencimento : null,
    indiceReajuste: ouNulo(d.indiceReajuste),
    status: d.status,
  };
}

export async function criarLocacao(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "locacoes.criar");
    const parsed = lerLocacao(formData);
    if (!parsed.success) return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "dados inválidos" };
    const imovelId = await pertence(sessao.imobiliariaId, "imovel", parsed.data.imovelId);
    if (!imovelId) return { sucesso: false, erro: "imóvel inválido" };

    await prismaImob.$transaction(async (tx) => {
      const loc = await tx.locacao.create({
        data: {
          imobiliariaId: sessao.imobiliariaId,
          ...(await dadosLocacao(sessao.imobiliariaId, parsed.data, imovelId)),
        },
      });
      if (loc.status === "ATIVO") {
        await tx.imovel.update({ where: { id: imovelId }, data: { status: "ALUGADO" } });
      }
      await registrarAuditoria(
        {
          imobiliariaId: sessao.imobiliariaId,
          usuarioId: sessao.id,
          entidade: "Locacao",
          entidadeId: loc.id,
          acao: "criar",
        },
        tx,
      );
    });

    revalidatePath("/imob/locacoes");
    revalidatePath("/imob/imoveis");
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível registrar a locação") };
  }
}

export async function editarLocacao(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "locacoes.editar");
    const id = String(formData.get("id") ?? "");
    const alvo = await obterLocacaoDoTenant(sessao.imobiliariaId, id);
    if (!alvo) return { sucesso: false, erro: "locação não encontrada" };
    const parsed = lerLocacao(formData);
    if (!parsed.success) return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "dados inválidos" };
    const imovelId = await pertence(sessao.imobiliariaId, "imovel", parsed.data.imovelId);
    if (!imovelId) return { sucesso: false, erro: "imóvel inválido" };

    await prismaImob.locacao.update({
      where: { id: alvo.id },
      data: await dadosLocacao(sessao.imobiliariaId, parsed.data, imovelId),
    });
    await auditar(sessao, "Locacao", alvo.id, "editar", { status: parsed.data.status });
    revalidatePath("/imob/locacoes");
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível editar a locação") };
  }
}

// ===========================================================================
// Contratos
// ===========================================================================

function lerContrato(formData: FormData) {
  return contratoSchema.safeParse({
    titulo: formData.get("titulo"),
    tipo: formData.get("tipo"),
    imovelId: formData.get("imovelId") || undefined,
    clienteId: formData.get("clienteId") || undefined,
    proprietarioId: formData.get("proprietarioId") || undefined,
    dataInicio: formData.get("dataInicio") || undefined,
    dataFim: formData.get("dataFim") || undefined,
    status: formData.get("status") || "ATIVO",
    observacoes: formData.get("observacoes") || undefined,
  });
}

async function dadosContrato(imobiliariaId: string, d: ReturnType<typeof contratoSchema.parse>) {
  return {
    titulo: d.titulo,
    tipo: d.tipo,
    imovelId: await pertence(imobiliariaId, "imovel", d.imovelId),
    clienteId: await pertence(imobiliariaId, "cliente", d.clienteId),
    proprietarioId: await pertence(imobiliariaId, "proprietario", d.proprietarioId),
    dataInicio: dataOuNulo(d.dataInicio),
    dataFim: dataOuNulo(d.dataFim),
    status: d.status,
    observacoes: ouNulo(d.observacoes),
  };
}

export async function criarContrato(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "contratos.criar");
    const parsed = lerContrato(formData);
    if (!parsed.success) return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "dados inválidos" };
    const criado = await prismaImob.contrato.create({
      data: { imobiliariaId: sessao.imobiliariaId, ...(await dadosContrato(sessao.imobiliariaId, parsed.data)) },
    });
    await auditar(sessao, "Contrato", criado.id, "criar", { titulo: criado.titulo, tipo: criado.tipo });
    revalidatePath("/imob/contratos");
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível criar o contrato") };
  }
}

export async function editarContrato(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "contratos.editar");
    const id = String(formData.get("id") ?? "");
    const alvo = await obterContratoDoTenant(sessao.imobiliariaId, id);
    if (!alvo) return { sucesso: false, erro: "contrato não encontrado" };
    const parsed = lerContrato(formData);
    if (!parsed.success) return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "dados inválidos" };
    await prismaImob.contrato.update({
      where: { id: alvo.id },
      data: await dadosContrato(sessao.imobiliariaId, parsed.data),
    });
    await auditar(sessao, "Contrato", alvo.id, "editar", { status: parsed.data.status });
    revalidatePath("/imob/contratos");
    revalidatePath(`/imob/contratos/${alvo.id}`);
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível editar o contrato") };
  }
}

export async function adicionarDocumentoContrato(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "contratos.editar");
    const parsed = documentoContratoSchema.safeParse({
      contratoId: formData.get("contratoId"),
      nome: formData.get("nome"),
      url: formData.get("url"),
    });
    if (!parsed.success) return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "dados inválidos" };
    // aceita http(s) e data URLs (mesma validação de mídia)
    if (!/^https?:\/\/.+/i.test(parsed.data.url) && !urlDeImagemValida(parsed.data.url)) {
      return { sucesso: false, erro: "informe uma URL http(s) válida" };
    }
    const contrato = await obterContratoDoTenant(sessao.imobiliariaId, parsed.data.contratoId);
    if (!contrato) return { sucesso: false, erro: "contrato não encontrado" };
    await prismaImob.contratoDocumento.create({
      data: { contratoId: contrato.id, nome: parsed.data.nome, url: parsed.data.url },
    });
    revalidatePath(`/imob/contratos/${contrato.id}`);
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível adicionar o documento") };
  }
}

export async function removerDocumentoContrato(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "contratos.editar");
    const contratoId = String(formData.get("contratoId") ?? "");
    const documentoId = String(formData.get("documentoId") ?? "");
    const contrato = await obterContratoDoTenant(sessao.imobiliariaId, contratoId);
    if (!contrato?.documentos.some((doc) => doc.id === documentoId)) {
      return { sucesso: false, erro: "documento não encontrado" };
    }
    await prismaImob.contratoDocumento.delete({ where: { id: documentoId } });
    revalidatePath(`/imob/contratos/${contrato.id}`);
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível remover o documento") };
  }
}
