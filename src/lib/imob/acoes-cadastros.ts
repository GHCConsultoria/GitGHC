"use server";

import { revalidatePath } from "next/cache";
import { registrarAuditoria } from "@/lib/imob/auditoria";
import { obterSessaoImob, type SessaoImob } from "@/lib/imob/auth";
import { obterClienteDoTenant, obterImovelDoTenant, obterProprietarioDoTenant } from "@/lib/imob/consultas";
import { prismaImob } from "@/lib/imob/prisma";
import { exigirPermissao } from "@/lib/imob/rbac";
import { paraMensagem, type ResultadoAcao, type ResultadoComId } from "@/lib/imob/resultado";
import { clienteSchema, fotoImovelSchema, imovelSchema, proprietarioSchema } from "@/lib/imob/schemas";
import { urlDeImagemValida } from "@/lib/imob/storage";
import type { Prisma } from "../../../prisma/imob/generated";

// Converte "" em null e Date/"" opcional em Date|null.
function ouNulo<T>(v: T | "" | undefined | null): T | null {
  return v === "" || v === undefined || v === null ? null : v;
}

// ---------------------------------------------------------------------------
// Proprietários
// ---------------------------------------------------------------------------

function lerProprietario(formData: FormData) {
  return proprietarioSchema.safeParse({
    nome: formData.get("nome"),
    tipoPessoa: formData.get("tipoPessoa") || "FISICA",
    documento: formData.get("documento") || undefined,
    email: formData.get("email") || undefined,
    telefone: formData.get("telefone") || undefined,
    whatsapp: formData.get("whatsapp") || undefined,
    endereco: formData.get("endereco") || undefined,
    observacoes: formData.get("observacoes") || undefined,
  });
}

export async function criarProprietario(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "proprietarios.criar");
    const parsed = lerProprietario(formData);
    if (!parsed.success) return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "dados inválidos" };
    const d = parsed.data;

    const criado = await prismaImob.proprietario.create({
      data: {
        imobiliariaId: sessao.imobiliariaId,
        nome: d.nome,
        tipoPessoa: d.tipoPessoa,
        documento: ouNulo(d.documento),
        email: ouNulo(d.email),
        telefone: ouNulo(d.telefone),
        whatsapp: ouNulo(d.whatsapp),
        endereco: ouNulo(d.endereco),
        observacoes: ouNulo(d.observacoes),
      },
    });
    await auditar(sessao, "Proprietario", criado.id, "criar", null, { nome: criado.nome });
    revalidatePath("/imob/proprietarios");
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível criar o proprietário") };
  }
}

export async function editarProprietario(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "proprietarios.editar");
    const id = String(formData.get("id") ?? "");
    const alvo = await obterProprietarioDoTenant(sessao.imobiliariaId, id);
    if (!alvo) return { sucesso: false, erro: "proprietário não encontrado" };
    const parsed = lerProprietario(formData);
    if (!parsed.success) return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "dados inválidos" };
    const d = parsed.data;

    await prismaImob.proprietario.update({
      where: { id: alvo.id },
      data: {
        nome: d.nome,
        tipoPessoa: d.tipoPessoa,
        documento: ouNulo(d.documento),
        email: ouNulo(d.email),
        telefone: ouNulo(d.telefone),
        whatsapp: ouNulo(d.whatsapp),
        endereco: ouNulo(d.endereco),
        observacoes: ouNulo(d.observacoes),
      },
    });
    await auditar(sessao, "Proprietario", alvo.id, "editar", { nome: alvo.nome }, { nome: d.nome });
    revalidatePath("/imob/proprietarios");
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível editar o proprietário") };
  }
}

export async function arquivarProprietario(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "proprietarios.excluir");
    const id = String(formData.get("id") ?? "");
    const alvo = await obterProprietarioDoTenant(sessao.imobiliariaId, id);
    if (!alvo) return { sucesso: false, erro: "proprietário não encontrado" };
    // Sem exclusão física: arquiva (ativo=false), preservando o histórico.
    await prismaImob.proprietario.update({ where: { id: alvo.id }, data: { ativo: false } });
    await auditar(sessao, "Proprietario", alvo.id, "arquivar", { ativo: true }, { ativo: false });
    revalidatePath("/imob/proprietarios");
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível arquivar o proprietário") };
  }
}

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------

function lerCliente(formData: FormData) {
  return clienteSchema.safeParse({
    nome: formData.get("nome"),
    tipo: formData.get("tipo") || "INTERESSADO",
    tipoPessoa: formData.get("tipoPessoa") || "FISICA",
    documento: formData.get("documento") || undefined,
    email: formData.get("email") || undefined,
    telefone: formData.get("telefone") || undefined,
    whatsapp: formData.get("whatsapp") || undefined,
    dataNascimento: formData.get("dataNascimento") || undefined,
    profissao: formData.get("profissao") || undefined,
    estadoCivil: formData.get("estadoCivil") || undefined,
    endereco: formData.get("endereco") || undefined,
    observacoes: formData.get("observacoes") || undefined,
    prefTipoImovel: formData.get("prefTipoImovel") || undefined,
    prefFinalidade: formData.get("prefFinalidade") || undefined,
    prefValorMin: formData.get("prefValorMin") || undefined,
    prefValorMax: formData.get("prefValorMax") || undefined,
    prefCidade: formData.get("prefCidade") || undefined,
    prefBairro: formData.get("prefBairro") || undefined,
    prefQuartos: formData.get("prefQuartos") || undefined,
    prefSuites: formData.get("prefSuites") || undefined,
    prefVagas: formData.get("prefVagas") || undefined,
    prefAreaMinima: formData.get("prefAreaMinima") || undefined,
  });
}

function dadosCliente(d: ReturnType<typeof clienteSchema.parse>) {
  return {
    nome: d.nome,
    tipo: d.tipo,
    tipoPessoa: d.tipoPessoa,
    documento: ouNulo(d.documento),
    email: ouNulo(d.email),
    telefone: ouNulo(d.telefone),
    whatsapp: ouNulo(d.whatsapp),
    dataNascimento: d.dataNascimento instanceof Date ? d.dataNascimento : null,
    profissao: ouNulo(d.profissao),
    estadoCivil: ouNulo(d.estadoCivil),
    endereco: ouNulo(d.endereco),
    observacoes: ouNulo(d.observacoes),
    prefTipoImovel: ouNulo(d.prefTipoImovel),
    prefFinalidade: ouNulo(d.prefFinalidade),
    prefValorMin: d.prefValorMin ?? null,
    prefValorMax: d.prefValorMax ?? null,
    prefCidade: ouNulo(d.prefCidade),
    prefBairro: ouNulo(d.prefBairro),
    prefQuartos: d.prefQuartos ?? null,
    prefSuites: d.prefSuites ?? null,
    prefVagas: d.prefVagas ?? null,
    prefAreaMinima: d.prefAreaMinima ?? null,
  };
}

export async function criarCliente(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "clientes.criar");
    const parsed = lerCliente(formData);
    if (!parsed.success) return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "dados inválidos" };

    const criado = await prismaImob.cliente.create({
      data: { imobiliariaId: sessao.imobiliariaId, ...dadosCliente(parsed.data) },
    });
    await auditar(sessao, "Cliente", criado.id, "criar", null, { nome: criado.nome, tipo: criado.tipo });
    revalidatePath("/imob/clientes");
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível criar o cliente") };
  }
}

export async function editarCliente(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "clientes.editar");
    const id = String(formData.get("id") ?? "");
    const alvo = await obterClienteDoTenant(sessao.imobiliariaId, id);
    if (!alvo) return { sucesso: false, erro: "cliente não encontrado" };
    const parsed = lerCliente(formData);
    if (!parsed.success) return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "dados inválidos" };

    await prismaImob.cliente.update({ where: { id: alvo.id }, data: dadosCliente(parsed.data) });
    await auditar(sessao, "Cliente", alvo.id, "editar", { nome: alvo.nome }, { nome: parsed.data.nome });
    revalidatePath("/imob/clientes");
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível editar o cliente") };
  }
}

export async function arquivarCliente(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "clientes.excluir");
    const id = String(formData.get("id") ?? "");
    const alvo = await obterClienteDoTenant(sessao.imobiliariaId, id);
    if (!alvo) return { sucesso: false, erro: "cliente não encontrado" };
    await prismaImob.cliente.update({ where: { id: alvo.id }, data: { ativo: false } });
    await auditar(sessao, "Cliente", alvo.id, "arquivar", { ativo: true }, { ativo: false });
    revalidatePath("/imob/clientes");
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível arquivar o cliente") };
  }
}

// ---------------------------------------------------------------------------
// Imóveis
// ---------------------------------------------------------------------------

function lerImovel(formData: FormData) {
  return imovelSchema.safeParse({
    codigo: formData.get("codigo"),
    titulo: formData.get("titulo"),
    descricao: formData.get("descricao") || undefined,
    tipo: formData.get("tipo"),
    finalidade: formData.get("finalidade"),
    status: formData.get("status") || "DISPONIVEL",
    precoVenda: formData.get("precoVenda") || undefined,
    precoAluguel: formData.get("precoAluguel") || undefined,
    condominio: formData.get("condominio") || undefined,
    iptu: formData.get("iptu") || undefined,
    areaTotal: formData.get("areaTotal") || undefined,
    areaConstruida: formData.get("areaConstruida") || undefined,
    quartos: formData.get("quartos") || undefined,
    suites: formData.get("suites") || undefined,
    banheiros: formData.get("banheiros") || undefined,
    vagas: formData.get("vagas") || undefined,
    andar: formData.get("andar") || undefined,
    anoConstrucao: formData.get("anoConstrucao") || undefined,
    aceitaFinanciamento: formData.get("aceitaFinanciamento") === "on",
    aceitaPermuta: formData.get("aceitaPermuta") === "on",
    mobiliado: formData.get("mobiliado") === "on",
    caracteristicas: String(formData.get("caracteristicas") ?? "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean),
    cep: formData.get("cep") || undefined,
    logradouro: formData.get("logradouro") || undefined,
    numero: formData.get("numero") || undefined,
    complemento: formData.get("complemento") || undefined,
    bairro: formData.get("bairro") || undefined,
    cidade: formData.get("cidade") || undefined,
    estado: formData.get("estado") || undefined,
    latitude: formData.get("latitude") || undefined,
    longitude: formData.get("longitude") || undefined,
    tourVirtualUrl: formData.get("tourVirtualUrl") || undefined,
    proprietarioIds: formData.getAll("proprietarioIds").map(String).filter(Boolean),
  });
}

function dadosImovel(d: ReturnType<typeof imovelSchema.parse>) {
  return {
    codigo: d.codigo,
    titulo: d.titulo,
    descricao: ouNulo(d.descricao),
    tipo: d.tipo,
    finalidade: d.finalidade,
    status: d.status,
    precoVenda: d.precoVenda ?? null,
    precoAluguel: d.precoAluguel ?? null,
    condominio: d.condominio ?? null,
    iptu: d.iptu ?? null,
    areaTotal: d.areaTotal ?? null,
    areaConstruida: d.areaConstruida ?? null,
    quartos: d.quartos ?? null,
    suites: d.suites ?? null,
    banheiros: d.banheiros ?? null,
    vagas: d.vagas ?? null,
    andar: d.andar ?? null,
    anoConstrucao: d.anoConstrucao ?? null,
    aceitaFinanciamento: d.aceitaFinanciamento ?? false,
    aceitaPermuta: d.aceitaPermuta ?? false,
    mobiliado: d.mobiliado ?? false,
    caracteristicas: d.caracteristicas,
    cep: ouNulo(d.cep),
    logradouro: ouNulo(d.logradouro),
    numero: ouNulo(d.numero),
    complemento: ouNulo(d.complemento),
    bairro: ouNulo(d.bairro),
    cidade: ouNulo(d.cidade),
    estado: ouNulo(d.estado),
    latitude: d.latitude ?? null,
    longitude: d.longitude ?? null,
    tourVirtualUrl: ouNulo(d.tourVirtualUrl),
  };
}

// Garante que todos os proprietarioIds pertencem ao tenant antes de vincular.
async function proprietariosValidosDoTenant(imobiliariaId: string, ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const encontrados = await prismaImob.proprietario.findMany({
    where: { id: { in: ids }, imobiliariaId },
    select: { id: true },
  });
  return encontrados.map((p) => p.id);
}

export async function criarImovel(formData: FormData): Promise<ResultadoComId> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "imoveis.criar");
    const parsed = lerImovel(formData);
    if (!parsed.success) return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "dados inválidos" };
    const d = parsed.data;
    const proprietarioIds = await proprietariosValidosDoTenant(sessao.imobiliariaId, d.proprietarioIds);

    let novoId = "";
    try {
      await prismaImob.$transaction(async (tx) => {
        const imovel = await tx.imovel.create({
          data: {
            imobiliariaId: sessao.imobiliariaId,
            criadoPorId: sessao.id,
            ...dadosImovel(d),
            proprietarios: { create: proprietarioIds.map((proprietarioId) => ({ proprietarioId })) },
          },
        });
        novoId = imovel.id;
        await registrarAuditoria(
          {
            imobiliariaId: sessao.imobiliariaId,
            usuarioId: sessao.id,
            entidade: "Imovel",
            entidadeId: imovel.id,
            acao: "criar",
            valorNovo: { codigo: imovel.codigo, titulo: imovel.titulo },
          },
          tx,
        );
      });
    } catch {
      return { sucesso: false, erro: "já existe um imóvel com esse código" };
    }

    revalidatePath("/imob/imoveis");
    return { sucesso: true, id: novoId };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível criar o imóvel") };
  }
}

export async function editarImovel(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "imoveis.editar");
    const id = String(formData.get("id") ?? "");
    const alvo = await obterImovelDoTenant(sessao.imobiliariaId, id);
    if (!alvo) return { sucesso: false, erro: "imóvel não encontrado" };
    const parsed = lerImovel(formData);
    if (!parsed.success) return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "dados inválidos" };
    const d = parsed.data;
    const proprietarioIds = await proprietariosValidosDoTenant(sessao.imobiliariaId, d.proprietarioIds);

    try {
      await prismaImob.$transaction(async (tx) => {
        await tx.imovel.update({ where: { id: alvo.id }, data: dadosImovel(d) });
        // regrava os vínculos de proprietário (deleta e recria — mudança de
        // conjunto é rara e o volume é pequeno)
        await tx.imovelProprietario.deleteMany({ where: { imovelId: alvo.id } });
        if (proprietarioIds.length > 0) {
          await tx.imovelProprietario.createMany({
            data: proprietarioIds.map((proprietarioId) => ({ imovelId: alvo.id, proprietarioId })),
          });
        }
        await registrarAuditoria(
          {
            imobiliariaId: sessao.imobiliariaId,
            usuarioId: sessao.id,
            entidade: "Imovel",
            entidadeId: alvo.id,
            acao: "editar",
            valorAnterior: { codigo: alvo.codigo, status: alvo.status },
            valorNovo: { codigo: d.codigo, status: d.status },
          },
          tx,
        );
      });
    } catch {
      return { sucesso: false, erro: "já existe um imóvel com esse código" };
    }

    revalidatePath("/imob/imoveis");
    revalidatePath(`/imob/imoveis/${alvo.id}`);
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível editar o imóvel") };
  }
}

// ---------------------------------------------------------------------------
// Fotos do imóvel (Fase 2: cadastro por URL; upload de binário entra na
// camada de storage sem mudar estas ações — ver src/lib/imob/storage.ts)
// ---------------------------------------------------------------------------

export async function adicionarFoto(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "imoveis.editar");
    const parsed = fotoImovelSchema.safeParse({
      imovelId: formData.get("imovelId"),
      url: formData.get("url"),
      legenda: formData.get("legenda") || undefined,
    });
    if (!parsed.success) return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "dados inválidos" };
    if (!urlDeImagemValida(parsed.data.url)) {
      return { sucesso: false, erro: "URL de imagem inválida (use http(s) ou data URL de imagem)" };
    }
    const imovel = await obterImovelDoTenant(sessao.imobiliariaId, parsed.data.imovelId);
    if (!imovel) return { sucesso: false, erro: "imóvel não encontrado" };

    const totalFotos = imovel.fotos.length;
    await prismaImob.fotoImovel.create({
      data: {
        imovelId: imovel.id,
        url: parsed.data.url,
        legenda: ouNulo(parsed.data.legenda),
        ordem: totalFotos,
        // primeira foto vira principal automaticamente
        principal: totalFotos === 0,
      },
    });
    revalidatePath(`/imob/imoveis/${imovel.id}`);
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível adicionar a foto") };
  }
}

export async function definirFotoPrincipal(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "imoveis.editar");
    const imovelId = String(formData.get("imovelId") ?? "");
    const fotoId = String(formData.get("fotoId") ?? "");
    const imovel = await obterImovelDoTenant(sessao.imobiliariaId, imovelId);
    if (!imovel?.fotos.some((f) => f.id === fotoId)) {
      return { sucesso: false, erro: "foto não encontrada" };
    }
    await prismaImob.$transaction([
      prismaImob.fotoImovel.updateMany({ where: { imovelId: imovel.id }, data: { principal: false } }),
      prismaImob.fotoImovel.update({ where: { id: fotoId }, data: { principal: true } }),
    ]);
    revalidatePath(`/imob/imoveis/${imovel.id}`);
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível definir a foto principal") };
  }
}

export async function removerFoto(formData: FormData): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessaoImob();
    exigirPermissao(sessao.papel.permissoes, "imoveis.editar");
    const imovelId = String(formData.get("imovelId") ?? "");
    const fotoId = String(formData.get("fotoId") ?? "");
    const imovel = await obterImovelDoTenant(sessao.imobiliariaId, imovelId);
    const foto = imovel?.fotos.find((f) => f.id === fotoId);
    if (!imovel || !foto) return { sucesso: false, erro: "foto não encontrada" };

    await prismaImob.fotoImovel.delete({ where: { id: fotoId } });
    // se removeu a principal, promove a primeira restante
    if (foto.principal) {
      const proxima = imovel.fotos.find((f) => f.id !== fotoId);
      if (proxima) {
        await prismaImob.fotoImovel.update({ where: { id: proxima.id }, data: { principal: true } });
      }
    }
    revalidatePath(`/imob/imoveis/${imovel.id}`);
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: paraMensagem(erro, "não foi possível remover a foto") };
  }
}

// ---------------------------------------------------------------------------

async function auditar(
  sessao: SessaoImob,
  entidade: string,
  entidadeId: string,
  acao: string,
  valorAnterior: Prisma.InputJsonValue | null,
  valorNovo: Prisma.InputJsonValue | null,
): Promise<void> {
  await registrarAuditoria({
    imobiliariaId: sessao.imobiliariaId,
    usuarioId: sessao.id,
    entidade,
    entidadeId,
    acao,
    valorAnterior: valorAnterior ?? undefined,
    valorNovo: valorNovo ?? undefined,
  });
}
