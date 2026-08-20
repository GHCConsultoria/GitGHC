"use server";

import { revalidatePath } from "next/cache";
import { registrarAuditoria } from "@/lib/imob/auditoria";
import { obterSessaoImob } from "@/lib/imob/auth";
import { obterDocumentoDoTenant } from "@/lib/imob/consultas-conteudo";
import { obterNotificacaoDoTenant } from "@/lib/imob/notificacoes";
import { prismaImob } from "@/lib/imob/prisma";
import { exigirPermissao } from "@/lib/imob/rbac";
import { paraMensagem, type ResultadoAcao } from "@/lib/imob/resultado";
import { documentoSchema } from "@/lib/imob/schemas";

async function pertence(
  imobiliariaId: string,
  modelo: "imovel" | "cliente" | "proprietario" | "contrato",
  id: string | null | undefined,
): Promise<string | null> {
  if (!id) return null;
  const delegate = prismaImob[modelo] as { findFirst: (a: unknown) => Promise<{ id: string } | null> };
  const achado = await delegate.findFirst({ where: { id, imobiliariaId }, select: { id: true } });
  return achado?.id ?? null;
}

// --- Documentos -----------------------------------------------------------

export async function criarDocumento(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "documentos.criar");
    const parsed = documentoSchema.safeParse({
      nome: formData.get("nome"),
      tipo: formData.get("tipo") || "OUTROS",
      url: formData.get("url"),
      validade: formData.get("validade") || undefined,
      clienteId: formData.get("clienteId") || undefined,
      proprietarioId: formData.get("proprietarioId") || undefined,
      imovelId: formData.get("imovelId") || undefined,
      contratoId: formData.get("contratoId") || undefined,
    });
    if (!parsed.success) return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "dados inválidos" };
    const d = parsed.data;
    if (!/^https?:\/\/.+/i.test(d.url) && !/^data:.+/i.test(d.url)) {
      return { sucesso: false, erro: "informe uma URL http(s) válida" };
    }
    const criado = await prismaImob.documento.create({
      data: {
        imobiliariaId: sessao.imobiliariaId,
        nome: d.nome,
        tipo: d.tipo,
        url: d.url,
        validade: d.validade instanceof Date ? d.validade : null,
        clienteId: await pertence(sessao.imobiliariaId, "cliente", d.clienteId),
        proprietarioId: await pertence(sessao.imobiliariaId, "proprietario", d.proprietarioId),
        imovelId: await pertence(sessao.imobiliariaId, "imovel", d.imovelId),
        contratoId: await pertence(sessao.imobiliariaId, "contrato", d.contratoId),
      },
    });
    await registrarAuditoria({
      imobiliariaId: sessao.imobiliariaId,
      usuarioId: sessao.id,
      entidade: "Documento",
      entidadeId: criado.id,
      acao: "criar",
      valorNovo: { nome: criado.nome, tipo: criado.tipo },
    });
    revalidatePath("/imob/documentos");
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível adicionar o documento") };
  }
}

export async function removerDocumento(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "documentos.excluir");
    const id = String(formData.get("id") ?? "");
    const alvo = await obterDocumentoDoTenant(sessao.imobiliariaId, id);
    if (!alvo) return { sucesso: false, erro: "documento não encontrado" };
    await prismaImob.documento.delete({ where: { id: alvo.id } });
    await registrarAuditoria({
      imobiliariaId: sessao.imobiliariaId,
      usuarioId: sessao.id,
      entidade: "Documento",
      entidadeId: alvo.id,
      acao: "remover",
      valorAnterior: { nome: alvo.nome },
    });
    revalidatePath("/imob/documentos");
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível remover o documento") };
  }
}

// --- Notificações ---------------------------------------------------------

export async function marcarNotificacaoLida(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    const id = String(formData.get("id") ?? "");
    const alvo = await obterNotificacaoDoTenant(sessao.imobiliariaId, id);
    if (!alvo) return { sucesso: false, erro: "notificação não encontrada" };
    if (!alvo.lida) {
      await prismaImob.notificacao.update({ where: { id: alvo.id }, data: { lida: true, lidaEm: new Date() } });
    }
    revalidatePath("/imob/notificacoes");
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível marcar como lida") };
  }
}

export async function marcarTodasNotificacoesLidas(): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    await prismaImob.notificacao.updateMany({
      where: { imobiliariaId: sessao.imobiliariaId, lida: false },
      data: { lida: true, lidaEm: new Date() },
    });
    revalidatePath("/imob/notificacoes");
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível atualizar as notificações") };
  }
}
