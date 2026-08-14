"use server";

import { EstagioLead, OrigemLead, Prisma, ResultadoVisita } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { obterUsuarioAtual } from "@/lib/auth";
import { UFS_BRASIL } from "@/lib/br/ufs";
import { ESTAGIOS_PIPELINE, ehEstagioTerminal } from "@/lib/crm/funil";
import { prisma } from "@/lib/prisma";

export type ResultadoAcao = { sucesso: true } | { sucesso: false; erro: string };

// Data de dia vinda de um <input type="date"> (YYYY-MM-DD). Guardamos como um
// instante ancorado ao meio-dia de São Paulo, para que o dia fique
// inequívoco no fuso do usuário em qualquer conversão (ver
// src/lib/crm/atividade.ts). -03:00 é o offset de São Paulo.
const dataDiaSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "data inválida")
  .transform((s) => new Date(`${s}T12:00:00-03:00`))
  .refine((d) => !Number.isNaN(d.getTime()), "data inválida");

// Aceita centavos já convertidos no cliente (ver src/lib/crm/moeda.ts) — o
// campo textual em reais é parseado lá antes de chegar aqui.
const centavosSchema = z.number().int().min(0).nullable();

async function garantirLeadDoEscritorio(leadId: string, escritorioId: string) {
  const lead = await prisma.leadComercial.findFirst({ where: { id: leadId, escritorioId } });
  return lead;
}

// ---------------------------------------------------------------------------
// Lead
// ---------------------------------------------------------------------------

const criarLeadSchema = z.object({
  nomeEmpresa: z.string().trim().min(1, "informe o nome da empresa"),
  nicho: z.string().trim().min(1, "informe o nicho/segmento"),
  contatoNome: z.string().trim().max(200).optional(),
  contatoCargo: z.string().trim().max(200).optional(),
  telefone: z.string().trim().max(60).optional(),
  email: z.string().trim().max(200).optional(),
  cidade: z.string().trim().max(120).optional(),
  uf: z.enum(UFS_BRASIL).optional(),
  endereco: z.string().trim().max(300).optional(),
  origem: z.nativeEnum(OrigemLead),
  valorPotencialCentavos: centavosSchema,
});

function limparOpcional(valor: string | undefined): string | null {
  const t = valor?.trim();
  return t ? t : null;
}

/** Cadastra um novo lead comercial. escritorioId vem sempre da sessão. */
export async function criarLead(input: unknown): Promise<ResultadoAcao> {
  const parsed = criarLeadSchema.safeParse(input);
  if (!parsed.success) {
    return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "payload inválido" };
  }
  const usuario = await obterUsuarioAtual();
  const d = parsed.data;

  const lead = await prisma.leadComercial.create({
    data: {
      escritorioId: usuario.escritorioId,
      nomeEmpresa: d.nomeEmpresa,
      nicho: d.nicho,
      contatoNome: limparOpcional(d.contatoNome),
      contatoCargo: limparOpcional(d.contatoCargo),
      telefone: limparOpcional(d.telefone),
      email: limparOpcional(d.email),
      cidade: limparOpcional(d.cidade),
      uf: d.uf ?? null,
      endereco: limparOpcional(d.endereco),
      origem: d.origem,
      valorPotencialCentavos: d.valorPotencialCentavos,
      responsavelId: usuario.id,
    },
  });

  await prisma.logAuditoria.create({
    data: {
      usuarioId: usuario.id,
      entidade: "LeadComercial",
      entidadeId: lead.id,
      acao: "CRIAR",
      valorAnterior: Prisma.JsonNull,
      valorNovo: { nomeEmpresa: lead.nomeEmpresa, nicho: lead.nicho, origem: lead.origem },
    },
  });

  revalidatePath("/crm");
  revalidatePath("/crm/leads");
  return { sucesso: true };
}

const moverEstagioSchema = z.object({
  leadId: z.string().min(1),
  estagio: z.nativeEnum(EstagioLead),
});

/**
 * Move um lead entre estágios NÃO terminais do funil. GANHO e PERDIDO têm
 * ações próprias (marcarLeadGanho/marcarLeadPerdido) porque exigem capturar
 * valor fechado e motivo da perda — deixar cair aqui perderia esses dados.
 */
export async function moverEstagioLead(input: unknown): Promise<ResultadoAcao> {
  const parsed = moverEstagioSchema.safeParse(input);
  if (!parsed.success) {
    return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "payload inválido" };
  }
  if (ehEstagioTerminal(parsed.data.estagio)) {
    return { sucesso: false, erro: "use a ação de ganhar ou perder para estágios finais" };
  }

  const usuario = await obterUsuarioAtual();
  const lead = await garantirLeadDoEscritorio(parsed.data.leadId, usuario.escritorioId);
  if (!lead) return { sucesso: false, erro: "lead não encontrado neste escritório" };

  // Reabrir um lead terminal (ganho/perdido) limpa os campos de fechamento
  // pra não deixar dado incoerente (um lead "em negociação" com ganhoEm
  // preenchido). Auditado como qualquer alteração.
  await prisma.leadComercial.update({
    where: { id: lead.id },
    data: {
      estagio: parsed.data.estagio,
      ganhoEm: null,
      perdidoEm: null,
      valorFechadoCentavos: null,
      motivoPerdaId: null,
      detalhePerda: null,
    },
  });

  await prisma.logAuditoria.create({
    data: {
      usuarioId: usuario.id,
      entidade: "LeadComercial",
      entidadeId: lead.id,
      acao: "MOVER_ESTAGIO",
      valorAnterior: { estagio: lead.estagio },
      valorNovo: { estagio: parsed.data.estagio },
    },
  });

  revalidatePath("/crm");
  revalidatePath("/crm/leads");
  revalidatePath(`/crm/leads/${lead.id}`);
  return { sucesso: true };
}

const marcarGanhoSchema = z.object({
  leadId: z.string().min(1),
  valorFechadoCentavos: centavosSchema,
});

/** Fecha um lead como GANHO, registrando o valor fechado e o timestamp. */
export async function marcarLeadGanho(input: unknown): Promise<ResultadoAcao> {
  const parsed = marcarGanhoSchema.safeParse(input);
  if (!parsed.success) {
    return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "payload inválido" };
  }
  const usuario = await obterUsuarioAtual();
  const lead = await garantirLeadDoEscritorio(parsed.data.leadId, usuario.escritorioId);
  if (!lead) return { sucesso: false, erro: "lead não encontrado neste escritório" };

  await prisma.leadComercial.update({
    where: { id: lead.id },
    data: {
      estagio: EstagioLead.GANHO,
      ganhoEm: new Date(),
      perdidoEm: null,
      motivoPerdaId: null,
      detalhePerda: null,
      valorFechadoCentavos: parsed.data.valorFechadoCentavos,
    },
  });

  await prisma.logAuditoria.create({
    data: {
      usuarioId: usuario.id,
      entidade: "LeadComercial",
      entidadeId: lead.id,
      acao: "GANHAR",
      valorAnterior: { estagio: lead.estagio },
      valorNovo: { estagio: "GANHO", valorFechadoCentavos: parsed.data.valorFechadoCentavos },
    },
  });

  revalidatePath("/crm");
  revalidatePath("/crm/leads");
  revalidatePath(`/crm/leads/${lead.id}`);
  return { sucesso: true };
}

const marcarPerdidoSchema = z.object({
  leadId: z.string().min(1),
  motivoPerdaId: z.string().min(1, "escolha o motivo da perda"),
  detalhePerda: z.string().trim().max(500).optional(),
});

/**
 * Fecha um lead como PERDIDO. O motivo é obrigatório — é o dado que o BI usa
 * pra responder "por que estamos perdendo"; deixar perder sem motivo esvazia
 * essa análise.
 */
export async function marcarLeadPerdido(input: unknown): Promise<ResultadoAcao> {
  const parsed = marcarPerdidoSchema.safeParse(input);
  if (!parsed.success) {
    return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "payload inválido" };
  }
  const usuario = await obterUsuarioAtual();
  const lead = await garantirLeadDoEscritorio(parsed.data.leadId, usuario.escritorioId);
  if (!lead) return { sucesso: false, erro: "lead não encontrado neste escritório" };

  const motivo = await prisma.motivoPerdaComercial.findFirst({
    where: { id: parsed.data.motivoPerdaId, escritorioId: usuario.escritorioId },
  });
  if (!motivo) return { sucesso: false, erro: "motivo de perda inválido" };

  await prisma.leadComercial.update({
    where: { id: lead.id },
    data: {
      estagio: EstagioLead.PERDIDO,
      perdidoEm: new Date(),
      ganhoEm: null,
      valorFechadoCentavos: null,
      motivoPerdaId: motivo.id,
      detalhePerda: parsed.data.detalhePerda?.trim() || null,
    },
  });

  await prisma.logAuditoria.create({
    data: {
      usuarioId: usuario.id,
      entidade: "LeadComercial",
      entidadeId: lead.id,
      acao: "PERDER",
      valorAnterior: { estagio: lead.estagio },
      valorNovo: { estagio: "PERDIDO", motivo: motivo.descricao },
    },
  });

  revalidatePath("/crm");
  revalidatePath("/crm/leads");
  revalidatePath(`/crm/leads/${lead.id}`);
  return { sucesso: true };
}

// ---------------------------------------------------------------------------
// Visita
// ---------------------------------------------------------------------------

const registrarVisitaSchema = z.object({
  leadId: z.string().min(1),
  dataVisita: dataDiaSchema,
  local: z.string().trim().max(300).optional(),
  resultado: z.nativeEnum(ResultadoVisita),
  anotacoes: z.string().trim().max(2000).optional(),
});

const INDICE_VISITA_REALIZADA = ESTAGIOS_PIPELINE.findIndex((m) => m.estagio === "VISITA_REALIZADA");

/**
 * Registra uma visita presencial no histórico do lead. Quando a visita foi de
 * fato REALIZADA e o lead ainda estava num estágio anterior ao de "visita
 * realizada", avança o estágio automaticamente — só para frente, nunca para
 * trás, e nunca mexendo num lead já fechado (ganho/perdido). É um ganho de
 * fluxo pro vendedor (registrou a visita, o funil anda sozinho), auditado.
 */
export async function registrarVisita(input: unknown): Promise<ResultadoAcao> {
  const parsed = registrarVisitaSchema.safeParse(input);
  if (!parsed.success) {
    return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "payload inválido" };
  }
  const usuario = await obterUsuarioAtual();
  const lead = await garantirLeadDoEscritorio(parsed.data.leadId, usuario.escritorioId);
  if (!lead) return { sucesso: false, erro: "lead não encontrado neste escritório" };

  const indiceAtual = ESTAGIOS_PIPELINE.findIndex((m) => m.estagio === lead.estagio);
  const deveAvancar =
    parsed.data.resultado === ResultadoVisita.REALIZADA &&
    !ehEstagioTerminal(lead.estagio) &&
    indiceAtual >= 0 &&
    indiceAtual < INDICE_VISITA_REALIZADA;

  await prisma.$transaction(async (tx) => {
    const visita = await tx.visitaComercial.create({
      data: {
        leadId: lead.id,
        dataVisita: parsed.data.dataVisita,
        local: parsed.data.local?.trim() || null,
        resultado: parsed.data.resultado,
        anotacoes: parsed.data.anotacoes?.trim() || null,
        registradoPorId: usuario.id,
      },
    });

    if (deveAvancar) {
      await tx.leadComercial.update({
        where: { id: lead.id },
        data: { estagio: EstagioLead.VISITA_REALIZADA },
      });
    } else {
      // toca atualizadoEm pra o lead subir na lista mesmo sem mudar estágio
      await tx.leadComercial.update({ where: { id: lead.id }, data: { atualizadoEm: new Date() } });
    }

    await tx.logAuditoria.create({
      data: {
        usuarioId: usuario.id,
        entidade: "VisitaComercial",
        entidadeId: visita.id,
        acao: "REGISTRAR",
        valorAnterior: Prisma.JsonNull,
        valorNovo: {
          leadId: lead.id,
          resultado: visita.resultado,
          avancouEstagio: deveAvancar ? "VISITA_REALIZADA" : null,
        },
      },
    });
  });

  revalidatePath("/crm");
  revalidatePath("/crm/leads");
  revalidatePath(`/crm/leads/${lead.id}`);
  return { sucesso: true };
}

// ---------------------------------------------------------------------------
// Próximo passo
// ---------------------------------------------------------------------------

const adicionarPassoSchema = z.object({
  leadId: z.string().min(1),
  descricao: z.string().trim().min(1, "descreva o próximo passo"),
  dataPrevista: dataDiaSchema,
});

/** Cria um próximo passo (follow-up com data) para o lead. */
export async function adicionarProximoPasso(input: unknown): Promise<ResultadoAcao> {
  const parsed = adicionarPassoSchema.safeParse(input);
  if (!parsed.success) {
    return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "payload inválido" };
  }
  const usuario = await obterUsuarioAtual();
  const lead = await garantirLeadDoEscritorio(parsed.data.leadId, usuario.escritorioId);
  if (!lead) return { sucesso: false, erro: "lead não encontrado neste escritório" };

  const passo = await prisma.proximoPassoComercial.create({
    data: {
      leadId: lead.id,
      descricao: parsed.data.descricao,
      dataPrevista: parsed.data.dataPrevista,
      responsavelId: usuario.id,
    },
  });

  await prisma.logAuditoria.create({
    data: {
      usuarioId: usuario.id,
      entidade: "ProximoPassoComercial",
      entidadeId: passo.id,
      acao: "CRIAR",
      valorAnterior: Prisma.JsonNull,
      valorNovo: { leadId: lead.id, descricao: passo.descricao },
    },
  });

  revalidatePath("/crm");
  revalidatePath("/crm/agenda");
  revalidatePath(`/crm/leads/${lead.id}`);
  return { sucesso: true };
}

const mudarStatusPassoSchema = z.object({
  passoId: z.string().min(1),
  acao: z.enum(["CONCLUIR", "CANCELAR", "REABRIR"]),
});

/** Conclui, cancela ou reabre um próximo passo. Mudança de status, com auditoria. */
export async function mudarStatusPasso(input: unknown): Promise<ResultadoAcao> {
  const parsed = mudarStatusPassoSchema.safeParse(input);
  if (!parsed.success) {
    return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "payload inválido" };
  }
  const usuario = await obterUsuarioAtual();
  const passo = await prisma.proximoPassoComercial.findFirst({
    where: { id: parsed.data.passoId, lead: { escritorioId: usuario.escritorioId } },
  });
  if (!passo) return { sucesso: false, erro: "passo não encontrado neste escritório" };

  const novoStatus =
    parsed.data.acao === "CONCLUIR" ? "CONCLUIDO" : parsed.data.acao === "CANCELAR" ? "CANCELADO" : "PENDENTE";

  await prisma.proximoPassoComercial.update({
    where: { id: passo.id },
    data: {
      status: novoStatus,
      concluidoEm: novoStatus === "CONCLUIDO" ? new Date() : null,
    },
  });

  await prisma.logAuditoria.create({
    data: {
      usuarioId: usuario.id,
      entidade: "ProximoPassoComercial",
      entidadeId: passo.id,
      acao: "MUDAR_STATUS",
      valorAnterior: { status: passo.status },
      valorNovo: { status: novoStatus },
    },
  });

  revalidatePath("/crm");
  revalidatePath("/crm/agenda");
  revalidatePath(`/crm/leads/${passo.leadId}`);
  return { sucesso: true };
}

// ---------------------------------------------------------------------------
// Motivo de perda (catálogo)
// ---------------------------------------------------------------------------

const criarMotivoSchema = z.object({ descricao: z.string().trim().min(1, "informe a descrição do motivo") });

/** Cadastra um novo motivo de perda no catálogo do escritório. */
export async function criarMotivoPerda(input: unknown): Promise<ResultadoAcao> {
  const parsed = criarMotivoSchema.safeParse(input);
  if (!parsed.success) {
    return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "payload inválido" };
  }
  const usuario = await obterUsuarioAtual();

  try {
    await prisma.motivoPerdaComercial.create({
      data: { escritorioId: usuario.escritorioId, descricao: parsed.data.descricao },
    });
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
      return { sucesso: false, erro: "já existe um motivo com essa descrição" };
    }
    throw erro;
  }

  revalidatePath("/crm/leads");
  return { sucesso: true };
}
