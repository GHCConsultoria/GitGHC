import { TipoAlertaPrazo } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { contarDiasUteisAte } from "@/lib/prazos/fila";
import { paraDataCalendarioSaoPaulo } from "@/lib/prazos/calculo";
import { formatarDataCalendario } from "@/lib/formatacao";
import { gerarTokenMarcarVisto } from "@/lib/prazos/token-visto";
import { obterEmailSender } from "./email";
import { obterWhatsappSender, type ParametrosAlertaWhatsapp } from "./whatsapp";

type TarefaPendente = { descricao: string } | undefined;

/** "Elaborar contestação" se houver tarefa pendente vinculada; senão, a ação genérica de acordo com o status. */
function acaoSugerida(statusPrazo: string, primeiraTarefaPendente: TarefaPendente): string {
  if (primeiraTarefaPendente) return primeiraTarefaPendente.descricao;
  return statusPrazo === "CONFIRMADO" ? "Verifique as tarefas do prazo no painel" : "Confirme o prazo no painel";
}

async function montarParametrosWhatsapp(
  paraTelefone: string,
  prazo: {
    id: string;
    status: string;
    tipoAto: string;
    dataFatal: Date;
    processo: { cliente: string; numeroCnj: string };
    tarefas: TarefaPendente[];
  },
): Promise<ParametrosAlertaWhatsapp> {
  const tokenMarcarVisto = await gerarTokenMarcarVisto(prazo.id);
  return {
    paraTelefone,
    cliente: prazo.processo.cliente,
    numeroCnj: prazo.processo.numeroCnj,
    tipoAto: prazo.tipoAto,
    dataFatal: formatarDataCalendario(prazo.dataFatal),
    acaoSugerida: acaoSugerida(prazo.status, prazo.tarefas[0]),
    tokenMarcarVisto,
  };
}

/**
 * Avisa os usuários de cada escritório sobre os prazos recém-criados nesta
 * execução (agrupados por escritório para o e-mail resumo; o WhatsApp vai
 * uma mensagem por prazo, porque é isso que faz o alerta ser acionável —
 * ver src/lib/alertas/whatsapp.ts). Não precisa de dedup: um Prazo só passa
 * por este caminho uma vez, no run em que é criado.
 */
export async function enviarAlertasNovosPendentes(prazosCriadosIds: string[]): Promise<number> {
  if (prazosCriadosIds.length === 0) return 0;

  const prazos = await prisma.prazo.findMany({
    where: { id: { in: prazosCriadosIds } },
    include: {
      processo: { include: { escritorio: { include: { usuarios: true } } } },
      tarefas: { where: { status: "PENDENTE" }, orderBy: { criadoEm: "asc" }, take: 1 },
    },
  });

  const idsPorEscritorio = new Map<string, typeof prazos>();
  for (const prazo of prazos) {
    const chave = prazo.processo.escritorioId;
    const grupo = idsPorEscritorio.get(chave) ?? [];
    grupo.push(prazo);
    idsPorEscritorio.set(chave, grupo);
  }

  const emailSender = obterEmailSender();
  const whatsappSender = obterWhatsappSender();
  let emailsEnviados = 0;

  for (const prazosDoEscritorio of Array.from(idsPorEscritorio.values())) {
    const { usuarios } = prazosDoEscritorio[0].processo.escritorio;
    const corpo = [
      `${prazosDoEscritorio.length} novo(s) prazo(s) aguardando confirmação:`,
      "",
      ...prazosDoEscritorio.map(
        (prazo) =>
          `- ${prazo.processo.cliente} (${prazo.processo.numeroCnj}), ${prazo.tipoAto}, data fatal ${prazo.dataFatal.toISOString().slice(0, 10)}`,
      ),
      "",
      "Confirme no painel: nenhum prazo vira definitivo sem sua confirmação.",
    ].join("\n");

    for (const usuario of usuarios) {
      await emailSender.enviar({
        para: usuario.email,
        assunto: `${prazosDoEscritorio.length} novo(s) prazo(s) aguardando confirmação`,
        corpo,
      });
      emailsEnviados += 1;

      if (usuario.telefoneWhatsapp) {
        for (const prazo of prazosDoEscritorio) {
          await whatsappSender.enviarAlerta(await montarParametrosWhatsapp(usuario.telefoneWhatsapp, prazo));
        }
      }
    }
  }

  return emailsEnviados;
}

const DIAS_DE_ALERTA: Array<{ diasUteisRestantes: number; tipo: TipoAlertaPrazo }> = [
  { diasUteisRestantes: 5, tipo: TipoAlertaPrazo.D5 },
  { diasUteisRestantes: 2, tipo: TipoAlertaPrazo.D2 },
  { diasUteisRestantes: 1, tipo: TipoAlertaPrazo.D1 },
];

/**
 * Avisa quando um prazo CONFIRMADO entra em D-5, D-2 ou D-1 (dias úteis).
 * AlertaPrazoEnviado garante que cada combinação (prazo, tipo de alerta) só
 * dispara uma vez, mesmo rodando este job todo dia útil.
 */
export async function enviarAlertasDeVencimentoProximo(): Promise<number> {
  const hoje = paraDataCalendarioSaoPaulo(new Date());

  const prazosConfirmados = await prisma.prazo.findMany({
    where: { status: "CONFIRMADO" },
    include: {
      processo: { include: { escritorio: { include: { usuarios: true } } } },
      tarefas: { where: { status: "PENDENTE" }, orderBy: { criadoEm: "asc" }, take: 1 },
    },
  });

  const emailSender = obterEmailSender();
  const whatsappSender = obterWhatsappSender();
  let emailsEnviados = 0;

  for (const prazo of prazosConfirmados) {
    const diasUteisRestantes = contarDiasUteisAte(hoje, prazo.dataFatal);
    const alerta = DIAS_DE_ALERTA.find((candidato) => candidato.diasUteisRestantes === diasUteisRestantes);
    if (!alerta) continue;

    const jaEnviado = await prisma.alertaPrazoEnviado.findUnique({
      where: { prazoId_tipo: { prazoId: prazo.id, tipo: alerta.tipo } },
    });
    if (jaEnviado) continue;

    const corpo = [
      `O prazo de ${prazo.processo.cliente} (${prazo.processo.numeroCnj}) vence em ${diasUteisRestantes} dia(s) útil(eis).`,
      `Tipo de ato: ${prazo.tipoAto}`,
      `Data fatal: ${prazo.dataFatal.toISOString().slice(0, 10)}`,
    ].join("\n");

    for (const usuario of prazo.processo.escritorio.usuarios) {
      await emailSender.enviar({
        para: usuario.email,
        assunto: `Prazo vence em ${diasUteisRestantes} dia(s) útil(eis) — ${prazo.processo.cliente}`,
        corpo,
      });
      emailsEnviados += 1;

      if (usuario.telefoneWhatsapp) {
        await whatsappSender.enviarAlerta(await montarParametrosWhatsapp(usuario.telefoneWhatsapp, prazo));
      }
    }

    await prisma.alertaPrazoEnviado.create({ data: { prazoId: prazo.id, tipo: alerta.tipo } });
  }

  return emailsEnviados;
}
