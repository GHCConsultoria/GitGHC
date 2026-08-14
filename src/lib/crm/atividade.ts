import type { StatusProximoPasso } from "@prisma/client";

const TIME_ZONE = "America/Sao_Paulo";

// Chave de dia-calendário no fuso de São Paulo (YYYY-MM-DD). dataVisita e
// dataPrevista são instantes reais (têm hora), então agrupar por dia PRECISA
// ser no fuso do usuário — agrupar em UTC jogaria uma visita das 22h para o
// dia seguinte. Convenção obrigatória do projeto (ver CLAUDE.md).
export function chaveDiaSaoPaulo(data: Date): string {
  // en-CA formata como YYYY-MM-DD, que é exatamente a chave ordenável que
  // queremos, já convertida para o fuso.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(data);
}

// Formata um instante como DD/MM/YYYY no fuso de São Paulo — usado nas telas
// do CRM para datas de dia (visita, próximo passo), que são armazenadas como
// instantes ancorados ao meio-dia de São Paulo (ver acoes.ts).
export function formatarDiaBR(data: Date | string): string {
  const instante = typeof data === "string" ? new Date(data) : data;
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(instante);
}

export interface DiaComVisitas {
  dia: string; // YYYY-MM-DD (São Paulo)
  quantidade: number;
}

/**
 * Conta visitas por dia nos últimos `quantidadeDias` (incluindo hoje),
 * preenchendo com zero os dias sem visita — o gráfico de barras precisa da
 * série contínua, senão dias vazios somem e distorcem a leitura. `referencia`
 * é o "agora" injetado (determinístico no teste).
 */
export function visitasPorDia(
  visitas: Array<{ dataVisita: Date }>,
  quantidadeDias: number,
  referencia: Date,
): DiaComVisitas[] {
  const contagem = new Map<string, number>();
  for (const visita of visitas) {
    const chave = chaveDiaSaoPaulo(visita.dataVisita);
    contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
  }

  const dias: DiaComVisitas[] = [];
  const hojeChave = chaveDiaSaoPaulo(referencia);
  // Ancora o cursor ao meio-dia UTC do dia de referência (São Paulo) pra
  // andar dia a dia sem risco de pular por causa de horário de verão.
  const cursor = new Date(`${hojeChave}T12:00:00Z`);
  cursor.setUTCDate(cursor.getUTCDate() - (quantidadeDias - 1));

  for (let i = 0; i < quantidadeDias; i += 1) {
    const chave = chaveDiaSaoPaulo(cursor);
    dias.push({ dia: chave, quantidade: contagem.get(chave) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dias;
}

export type SituacaoPasso = "vencido" | "hoje" | "futuro";

/**
 * Classifica um próximo passo PENDENTE em vencido/hoje/futuro comparando a
 * data prevista com hoje, ambos no fuso de São Paulo. Passos não-pendentes
 * não têm situação temporal (retorna null). Comparar por chave de dia (string
 * ordenável) evita a armadilha de comparar instantes com horas diferentes.
 */
export function situacaoPasso(
  passo: { dataPrevista: Date; status: StatusProximoPasso },
  referencia: Date,
): SituacaoPasso | null {
  if (passo.status !== "PENDENTE") return null;
  const chavePasso = chaveDiaSaoPaulo(passo.dataPrevista);
  const chaveHoje = chaveDiaSaoPaulo(referencia);
  if (chavePasso < chaveHoje) return "vencido";
  if (chavePasso === chaveHoje) return "hoje";
  return "futuro";
}
