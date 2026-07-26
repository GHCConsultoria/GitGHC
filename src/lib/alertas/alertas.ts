import { TipoAlertaPrazo } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { contarDiasUteisAte } from "@/lib/prazos/fila";
import { paraDataCalendarioSaoPaulo } from "@/lib/prazos/calculo";
import { obterEmailSender } from "./email";

/**
 * Avisa os usuários de cada escritório sobre os prazos recém-criados nesta
 * execução (agrupados por escritório, um e-mail por usuário). Não precisa de
 * dedup: um Prazo só passa por este caminho uma vez, no run em que é criado.
 */
export async function enviarAlertasNovosPendentes(prazosCriadosIds: string[]): Promise<number> {
  if (prazosCriadosIds.length === 0) return 0;

  const prazos = await prisma.prazo.findMany({
    where: { id: { in: prazosCriadosIds } },
    include: {
      processo: { include: { escritorio: { include: { usuarios: true } } } },
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
    include: { processo: { include: { escritorio: { include: { usuarios: true } } } } },
  });

  const emailSender = obterEmailSender();
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
    }

    await prisma.alertaPrazoEnviado.create({ data: { prazoId: prazo.id, tipo: alerta.tipo } });
  }

  return emailsEnviados;
}
