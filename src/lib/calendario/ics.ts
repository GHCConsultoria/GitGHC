import { formatarNumeroCnjParaExibicao } from "@/lib/publicacoes/cnj";

export interface PrazoParaIcs {
  id: string;
  dataFatal: Date;
  tipoAto: string;
  descricao: string;
  cliente: string;
  numeroCnj: string;
  varaOrgao: string;
}

/** Escapa texto livre para uso em campos TEXT do ICS (RFC 5545 §3.3.11). */
function escaparTextoIcs(valor: string): string {
  return valor
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Dobra uma linha ICS que ultrapasse 75 octets, como exige o RFC 5545
 * (linhas contínuas começam com um espaço). Conta bytes UTF-8, não
 * caracteres — texto em português tem acentos multi-byte.
 */
function dobrarLinhaIcs(linha: string): string {
  const bytes = new TextEncoder().encode(linha);
  if (bytes.length <= 75) return linha;

  const partes: string[] = [];
  let inicio = 0;
  let limite = 75;
  while (inicio < bytes.length) {
    let fim = Math.min(inicio + limite, bytes.length);
    // Nunca corta no meio de um caractere multi-byte (continuation byte = 10xxxxxx).
    while (fim < bytes.length && (bytes[fim] & 0b1100_0000) === 0b1000_0000) {
      fim -= 1;
    }
    partes.push(new TextDecoder().decode(bytes.slice(inicio, fim)));
    inicio = fim;
    limite = 74; // a partir da 2a linha, 1 octet vai pro espaço de continuacao
  }
  return partes.join("\r\n ");
}

function formatarDataApenasDia(data: Date): string {
  const ano = data.getUTCFullYear();
  const mes = String(data.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(data.getUTCDate()).padStart(2, "0");
  return `${ano}${mes}${dia}`;
}

function diaSeguinte(data: Date): Date {
  const proximo = new Date(data.getTime());
  proximo.setUTCDate(proximo.getUTCDate() + 1);
  return proximo;
}

function formatarDataHoraUtc(data: Date): string {
  return data.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function gerarEventoIcs(prazo: PrazoParaIcs, agora: Date): string[] {
  return [
    "BEGIN:VEVENT",
    `UID:prazo-${prazo.id}@gitghc`,
    `DTSTAMP:${formatarDataHoraUtc(agora)}`,
    `DTSTART;VALUE=DATE:${formatarDataApenasDia(prazo.dataFatal)}`,
    `DTEND;VALUE=DATE:${formatarDataApenasDia(diaSeguinte(prazo.dataFatal))}`,
    `SUMMARY:${escaparTextoIcs(`Prazo: ${prazo.cliente} — ${prazo.tipoAto}`)}`,
    `DESCRIPTION:${escaparTextoIcs(
      `${prazo.descricao}\nProcesso ${formatarNumeroCnjParaExibicao(prazo.numeroCnj)} — ${prazo.varaOrgao}`,
    )}`,
    "END:VEVENT",
  ];
}

/**
 * Gera um feed ICS (RFC 5545) com um evento de dia inteiro por prazo — a
 * data fatal é um "dia de calendário", nunca um instante, por isso usamos
 * getters UTC diretos (mesma convenção de src/lib/formatacao.ts) em vez de
 * conversão de fuso horário, senão o evento aparece um dia adiantado ou
 * atrasado no Google Calendar/Outlook.
 */
export function gerarFeedIcs(nomeCalendario: string, prazos: PrazoParaIcs[], agora: Date = new Date()): string {
  const linhas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GitGHC//Prazos//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escaparTextoIcs(nomeCalendario)}`,
    ...prazos.flatMap((prazo) => gerarEventoIcs(prazo, agora)),
    "END:VCALENDAR",
  ];

  return linhas.map(dobrarLinhaIcs).join("\r\n") + "\r\n";
}
