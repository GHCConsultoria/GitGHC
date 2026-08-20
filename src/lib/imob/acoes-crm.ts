"use server";

import { revalidatePath } from "next/cache";
import { registrarAuditoria } from "@/lib/imob/auditoria";
import { obterSessaoImob, type SessaoImob } from "@/lib/imob/auth";
import {
  obterCaptacaoDoTenant,
  obterCorretorDoTenant,
  obterLeadDoTenant,
  obterTarefaDoTenant,
  obterVisitaDoTenant,
} from "@/lib/imob/consultas-crm";
import { prismaImob } from "@/lib/imob/prisma";
import { exigirPermissao } from "@/lib/imob/rbac";
import { paraMensagem, type ResultadoAcao } from "@/lib/imob/resultado";
import {
  captacaoSchema,
  corretorSchema,
  interacaoLeadSchema,
  leadSchema,
  moverLeadSchema,
  resultadoVisitaSchema,
  tarefaSchema,
  visitaSchema,
} from "@/lib/imob/schemas";

function ouNulo<T>(v: T | "" | undefined | null): T | null {
  return v === "" || v === undefined || v === null ? null : v;
}

function dataOuNulo(v: unknown): Date | null {
  return v instanceof Date ? v : null;
}

async function auditar(
  sessao: SessaoImob,
  entidade: string,
  entidadeId: string,
  acao: string,
  valorNovo?: Record<string, string | number | boolean | null>,
): Promise<void> {
  await registrarAuditoria({
    imobiliariaId: sessao.imobiliariaId,
    usuarioId: sessao.id,
    entidade,
    entidadeId,
    acao,
    valorNovo: valorNovo ?? undefined,
  });
}

/** Garante que um id referenciado pertence ao tenant; devolve null se não. */
async function corretorValido(imobiliariaId: string, id: string | null | undefined): Promise<string | null> {
  if (!id) return null;
  const c = await prismaImob.corretor.findFirst({ where: { id, imobiliariaId }, select: { id: true } });
  return c?.id ?? null;
}
async function imovelValido(imobiliariaId: string, id: string | null | undefined): Promise<string | null> {
  if (!id) return null;
  const i = await prismaImob.imovel.findFirst({ where: { id, imobiliariaId }, select: { id: true } });
  return i?.id ?? null;
}
async function clienteValido(imobiliariaId: string, id: string | null | undefined): Promise<string | null> {
  if (!id) return null;
  const c = await prismaImob.cliente.findFirst({ where: { id, imobiliariaId }, select: { id: true } });
  return c?.id ?? null;
}

// ===========================================================================
// Corretores
// ===========================================================================

function lerCorretor(formData: FormData) {
  return corretorSchema.safeParse({
    nome: formData.get("nome"),
    cpf: formData.get("cpf") || undefined,
    creci: formData.get("creci") || undefined,
    email: formData.get("email") || undefined,
    telefone: formData.get("telefone") || undefined,
    whatsapp: formData.get("whatsapp") || undefined,
    dataEntrada: formData.get("dataEntrada") || undefined,
    metaMensal: formData.get("metaMensal") || undefined,
    percentualComissao: formData.get("percentualComissao") || undefined,
  });
}

function dadosCorretor(d: ReturnType<typeof corretorSchema.parse>) {
  return {
    nome: d.nome,
    cpf: ouNulo(d.cpf),
    creci: ouNulo(d.creci),
    email: ouNulo(d.email),
    telefone: ouNulo(d.telefone),
    whatsapp: ouNulo(d.whatsapp),
    dataEntrada: dataOuNulo(d.dataEntrada),
    metaMensal: d.metaMensal ?? null,
    percentualComissao: d.percentualComissao ?? null,
  };
}

export async function criarCorretor(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "corretores.criar");
    const parsed = lerCorretor(formData);
    if (!parsed.success) return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "dados inválidos" };
    const criado = await prismaImob.corretor.create({
      data: { imobiliariaId: sessao.imobiliariaId, ...dadosCorretor(parsed.data) },
    });
    await auditar(sessao, "Corretor", criado.id, "criar", { nome: criado.nome });
    revalidatePath("/imob/corretores");
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível criar o corretor") };
  }
}

export async function editarCorretor(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "corretores.editar");
    const id = String(formData.get("id") ?? "");
    const alvo = await obterCorretorDoTenant(sessao.imobiliariaId, id);
    if (!alvo) return { sucesso: false, erro: "corretor não encontrado" };
    const parsed = lerCorretor(formData);
    if (!parsed.success) return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "dados inválidos" };
    await prismaImob.corretor.update({ where: { id: alvo.id }, data: dadosCorretor(parsed.data) });
    await auditar(sessao, "Corretor", alvo.id, "editar", { nome: parsed.data.nome });
    revalidatePath("/imob/corretores");
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível editar o corretor") };
  }
}

export async function arquivarCorretor(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "corretores.excluir");
    const id = String(formData.get("id") ?? "");
    const alvo = await obterCorretorDoTenant(sessao.imobiliariaId, id);
    if (!alvo) return { sucesso: false, erro: "corretor não encontrado" };
    await prismaImob.corretor.update({ where: { id: alvo.id }, data: { ativo: false } });
    await auditar(sessao, "Corretor", alvo.id, "arquivar", { ativo: false });
    revalidatePath("/imob/corretores");
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível arquivar o corretor") };
  }
}

// ===========================================================================
// Leads
// ===========================================================================

function lerLead(formData: FormData) {
  return leadSchema.safeParse({
    nome: formData.get("nome"),
    telefone: formData.get("telefone") || undefined,
    whatsapp: formData.get("whatsapp") || undefined,
    email: formData.get("email") || undefined,
    origem: formData.get("origem") || "OUTROS",
    etapa: formData.get("etapa") || "NOVO",
    valorPretendido: formData.get("valorPretendido") || undefined,
    observacoes: formData.get("observacoes") || undefined,
    proximaAcao: formData.get("proximaAcao") || undefined,
    corretorId: formData.get("corretorId") || undefined,
    imovelId: formData.get("imovelId") || undefined,
    clienteId: formData.get("clienteId") || undefined,
  });
}

export async function criarLead(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "leads.criar");
    const parsed = lerLead(formData);
    if (!parsed.success) return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "dados inválidos" };
    const d = parsed.data;
    const criado = await prismaImob.lead.create({
      data: {
        imobiliariaId: sessao.imobiliariaId,
        nome: d.nome,
        telefone: ouNulo(d.telefone),
        whatsapp: ouNulo(d.whatsapp),
        email: ouNulo(d.email),
        origem: d.origem,
        etapa: d.etapa,
        valorPretendido: d.valorPretendido ?? null,
        observacoes: ouNulo(d.observacoes),
        proximaAcao: dataOuNulo(d.proximaAcao),
        corretorId: await corretorValido(sessao.imobiliariaId, d.corretorId),
        imovelId: await imovelValido(sessao.imobiliariaId, d.imovelId),
        clienteId: await clienteValido(sessao.imobiliariaId, d.clienteId),
      },
    });
    await auditar(sessao, "Lead", criado.id, "criar", { nome: criado.nome, etapa: criado.etapa });
    revalidatePath("/imob/leads");
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível criar o lead") };
  }
}

export async function editarLead(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "leads.editar");
    const id = String(formData.get("id") ?? "");
    const alvo = await obterLeadDoTenant(sessao.imobiliariaId, id);
    if (!alvo) return { sucesso: false, erro: "lead não encontrado" };
    const parsed = lerLead(formData);
    if (!parsed.success) return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "dados inválidos" };
    const d = parsed.data;
    await prismaImob.lead.update({
      where: { id: alvo.id },
      data: {
        nome: d.nome,
        telefone: ouNulo(d.telefone),
        whatsapp: ouNulo(d.whatsapp),
        email: ouNulo(d.email),
        origem: d.origem,
        etapa: d.etapa,
        valorPretendido: d.valorPretendido ?? null,
        observacoes: ouNulo(d.observacoes),
        proximaAcao: dataOuNulo(d.proximaAcao),
        corretorId: await corretorValido(sessao.imobiliariaId, d.corretorId),
        imovelId: await imovelValido(sessao.imobiliariaId, d.imovelId),
        clienteId: await clienteValido(sessao.imobiliariaId, d.clienteId),
      },
    });
    await auditar(sessao, "Lead", alvo.id, "editar", { nome: d.nome, etapa: d.etapa });
    revalidatePath("/imob/leads");
    revalidatePath(`/imob/leads/${alvo.id}`);
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível editar o lead") };
  }
}

/** Move o lead para outra etapa do Kanban (arrastar/soltar ou botões). */
export async function moverLead(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "leads.editar");
    const parsed = moverLeadSchema.safeParse({
      leadId: formData.get("leadId"),
      etapa: formData.get("etapa"),
    });
    if (!parsed.success) return { sucesso: false, erro: "etapa inválida" };
    const alvo = await obterLeadDoTenant(sessao.imobiliariaId, parsed.data.leadId);
    if (!alvo) return { sucesso: false, erro: "lead não encontrado" };
    if (alvo.etapa === parsed.data.etapa) return { sucesso: true };
    await prismaImob.lead.update({
      where: { id: alvo.id },
      data: { etapa: parsed.data.etapa, ultimoContato: new Date() },
    });
    await auditar(sessao, "Lead", alvo.id, "mover-etapa", { de: alvo.etapa, para: parsed.data.etapa });
    revalidatePath("/imob/leads");
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível mover o lead") };
  }
}

export async function registrarInteracao(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "leads.editar");
    const parsed = interacaoLeadSchema.safeParse({
      leadId: formData.get("leadId"),
      tipo: formData.get("tipo"),
      descricao: formData.get("descricao"),
    });
    if (!parsed.success) return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "dados inválidos" };
    const lead = await obterLeadDoTenant(sessao.imobiliariaId, parsed.data.leadId);
    if (!lead) return { sucesso: false, erro: "lead não encontrado" };
    await prismaImob.$transaction([
      prismaImob.interacaoLead.create({
        data: { leadId: lead.id, tipo: parsed.data.tipo, descricao: parsed.data.descricao, criadoPorId: sessao.id },
      }),
      prismaImob.lead.update({ where: { id: lead.id }, data: { ultimoContato: new Date() } }),
    ]);
    revalidatePath(`/imob/leads/${lead.id}`);
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível registrar a interação") };
  }
}

// ===========================================================================
// Visitas
// ===========================================================================

export async function criarVisita(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "visitas.criar");
    const parsed = visitaSchema.safeParse({
      imovelId: formData.get("imovelId"),
      clienteId: formData.get("clienteId") || undefined,
      leadId: formData.get("leadId") || undefined,
      corretorId: formData.get("corretorId") || undefined,
      data: formData.get("data"),
      duracaoMin: formData.get("duracaoMin") || 30,
      status: formData.get("status") || "AGENDADA",
      observacoes: formData.get("observacoes") || undefined,
    });
    if (!parsed.success) return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "dados inválidos" };
    const d = parsed.data;
    const imovelId = await imovelValido(sessao.imobiliariaId, d.imovelId);
    if (!imovelId) return { sucesso: false, erro: "imóvel inválido" };
    const criada = await prismaImob.visita.create({
      data: {
        imobiliariaId: sessao.imobiliariaId,
        imovelId,
        clienteId: await clienteValido(sessao.imobiliariaId, d.clienteId),
        leadId: ouNulo(d.leadId),
        corretorId: await corretorValido(sessao.imobiliariaId, d.corretorId),
        data: d.data,
        duracaoMin: d.duracaoMin,
        status: d.status,
        observacoes: ouNulo(d.observacoes),
      },
    });
    await auditar(sessao, "Visita", criada.id, "criar", { status: criada.status });
    revalidatePath("/imob/visitas");
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível agendar a visita") };
  }
}

export async function registrarResultadoVisita(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "visitas.editar");
    const parsed = resultadoVisitaSchema.safeParse({
      visitaId: formData.get("visitaId"),
      status: formData.get("status"),
      interesse: formData.get("interesse") || undefined,
      nota: formData.get("nota") || undefined,
      feedback: formData.get("feedback") || undefined,
      proximoPasso: formData.get("proximoPasso") || undefined,
    });
    if (!parsed.success) return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "dados inválidos" };
    const alvo = await obterVisitaDoTenant(sessao.imobiliariaId, parsed.data.visitaId);
    if (!alvo) return { sucesso: false, erro: "visita não encontrada" };
    const d = parsed.data;
    await prismaImob.visita.update({
      where: { id: alvo.id },
      data: {
        status: d.status,
        interesse: d.interesse ? d.interesse : null,
        nota: typeof d.nota === "number" ? d.nota : null,
        feedback: ouNulo(d.feedback),
        proximoPasso: ouNulo(d.proximoPasso),
      },
    });
    await auditar(sessao, "Visita", alvo.id, "resultado", { status: d.status });
    revalidatePath("/imob/visitas");
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível registrar o resultado") };
  }
}

// ===========================================================================
// Tarefas
// ===========================================================================

export async function criarTarefa(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "tarefas.criar");
    const parsed = tarefaSchema.safeParse({
      titulo: formData.get("titulo"),
      descricao: formData.get("descricao") || undefined,
      prioridade: formData.get("prioridade") || "MEDIA",
      prazo: formData.get("prazo") || undefined,
      responsavelId: formData.get("responsavelId") || undefined,
      clienteId: formData.get("clienteId") || undefined,
      imovelId: formData.get("imovelId") || undefined,
      leadId: formData.get("leadId") || undefined,
    });
    if (!parsed.success) return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "dados inválidos" };
    const d = parsed.data;
    const criada = await prismaImob.tarefa.create({
      data: {
        imobiliariaId: sessao.imobiliariaId,
        titulo: d.titulo,
        descricao: ouNulo(d.descricao),
        prioridade: d.prioridade,
        prazo: dataOuNulo(d.prazo),
        responsavelId: ouNulo(d.responsavelId),
        clienteId: await clienteValido(sessao.imobiliariaId, d.clienteId),
        imovelId: await imovelValido(sessao.imobiliariaId, d.imovelId),
        leadId: ouNulo(d.leadId),
      },
    });
    await auditar(sessao, "Tarefa", criada.id, "criar", { titulo: criada.titulo });
    revalidatePath("/imob/tarefas");
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível criar a tarefa") };
  }
}

export async function alternarConclusaoTarefa(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "tarefas.editar");
    const id = String(formData.get("id") ?? "");
    const alvo = await obterTarefaDoTenant(sessao.imobiliariaId, id);
    if (!alvo) return { sucesso: false, erro: "tarefa não encontrada" };
    const concluir = alvo.status === "PENDENTE";
    await prismaImob.tarefa.update({
      where: { id: alvo.id },
      data: { status: concluir ? "CONCLUIDA" : "PENDENTE", concluidoEm: concluir ? new Date() : null },
    });
    await auditar(sessao, "Tarefa", alvo.id, concluir ? "concluir" : "reabrir");
    revalidatePath("/imob/tarefas");
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível atualizar a tarefa") };
  }
}

// ===========================================================================
// Captações
// ===========================================================================

function lerCaptacao(formData: FormData) {
  return captacaoSchema.safeParse({
    proprietarioId: formData.get("proprietarioId") || undefined,
    imovelId: formData.get("imovelId") || undefined,
    corretorId: formData.get("corretorId") || undefined,
    dataCaptacao: formData.get("dataCaptacao") || undefined,
    origem: formData.get("origem") || undefined,
    exclusividade: formData.get("exclusividade") === "on",
    comissaoPercentual: formData.get("comissaoPercentual") || undefined,
    validadeExclusividade: formData.get("validadeExclusividade") || undefined,
    status: formData.get("status") || "PROSPECTADO",
    observacoes: formData.get("observacoes") || undefined,
  });
}

async function dadosCaptacao(imobiliariaId: string, d: ReturnType<typeof captacaoSchema.parse>) {
  return {
    proprietarioId: ouNulo(d.proprietarioId),
    imovelId: await imovelValido(imobiliariaId, d.imovelId),
    corretorId: await corretorValido(imobiliariaId, d.corretorId),
    dataCaptacao: dataOuNulo(d.dataCaptacao),
    origem: ouNulo(d.origem),
    exclusividade: d.exclusividade ?? false,
    comissaoPercentual: d.comissaoPercentual ?? null,
    validadeExclusividade: dataOuNulo(d.validadeExclusividade),
    status: d.status,
    observacoes: ouNulo(d.observacoes),
  };
}

export async function criarCaptacao(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "captacoes.criar");
    const parsed = lerCaptacao(formData);
    if (!parsed.success) return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "dados inválidos" };
    const criada = await prismaImob.captacao.create({
      data: { imobiliariaId: sessao.imobiliariaId, ...(await dadosCaptacao(sessao.imobiliariaId, parsed.data)) },
    });
    await auditar(sessao, "Captacao", criada.id, "criar", { status: criada.status });
    revalidatePath("/imob/captacoes");
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível criar a captação") };
  }
}

export async function editarCaptacao(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "captacoes.editar");
    const id = String(formData.get("id") ?? "");
    const alvo = await obterCaptacaoDoTenant(sessao.imobiliariaId, id);
    if (!alvo) return { sucesso: false, erro: "captação não encontrada" };
    const parsed = lerCaptacao(formData);
    if (!parsed.success) return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "dados inválidos" };
    await prismaImob.captacao.update({
      where: { id: alvo.id },
      data: await dadosCaptacao(sessao.imobiliariaId, parsed.data),
    });
    await auditar(sessao, "Captacao", alvo.id, "editar", { status: parsed.data.status });
    revalidatePath("/imob/captacoes");
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível editar a captação") };
  }
}
