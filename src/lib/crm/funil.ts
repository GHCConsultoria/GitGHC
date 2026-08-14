import type { EstagioLead, OrigemLead } from "@prisma/client";

// ---------------------------------------------------------------------------
// Metadados do funil comercial
// ---------------------------------------------------------------------------
//
// Lógica pura de agregação para o BI do CRM: recebe registros simples (não
// entidades do Prisma) e devolve números prontos pro dashboard. Sem I/O, sem
// Date.now() escondido — tudo que depende de "hoje" recebe a referência por
// parâmetro, pra ser testável de forma determinística.

export interface MetaEstagio {
  estagio: EstagioLead;
  rotulo: string;
  // "tom" mapeia pra uma paleta do design system na UI (calm/attention/etc.).
  tom: "neutro" | "andamento" | "quente" | "ganho" | "perda";
}

// Ordem canônica do funil, do topo (primeiro contato) ao fundo (fechamento).
// PERDIDO fica fora desta sequência de propósito: é um desvio, não um degrau.
export const ESTAGIOS_PIPELINE: MetaEstagio[] = [
  { estagio: "PROSPECCAO", rotulo: "Prospecção", tom: "neutro" },
  { estagio: "CONTATO_FEITO", rotulo: "Contato feito", tom: "andamento" },
  { estagio: "VISITA_AGENDADA", rotulo: "Visita agendada", tom: "andamento" },
  { estagio: "VISITA_REALIZADA", rotulo: "Visita realizada", tom: "andamento" },
  { estagio: "PROPOSTA_ENVIADA", rotulo: "Proposta enviada", tom: "quente" },
  { estagio: "EM_NEGOCIACAO", rotulo: "Em negociação", tom: "quente" },
  { estagio: "GANHO", rotulo: "Ganho", tom: "ganho" },
];

export const META_PERDIDO: MetaEstagio = { estagio: "PERDIDO", rotulo: "Perdido", tom: "perda" };

// Todos os estágios (pipeline + perdido) — usado por seletores e rótulos.
export const TODOS_ESTAGIOS: MetaEstagio[] = [...ESTAGIOS_PIPELINE, META_PERDIDO];

const INDICE_ESTAGIO: Record<EstagioLead, number> = ESTAGIOS_PIPELINE.reduce(
  (acc, meta, i) => {
    acc[meta.estagio] = i;
    return acc;
  },
  { PERDIDO: -1 } as Record<EstagioLead, number>,
);

export function rotuloEstagio(estagio: EstagioLead): string {
  return TODOS_ESTAGIOS.find((m) => m.estagio === estagio)?.rotulo ?? estagio;
}

export const ROTULO_ORIGEM: Record<OrigemLead, string> = {
  PROSPECCAO_ATIVA: "Prospecção ativa",
  INDICACAO: "Indicação",
  EVENTO: "Evento",
  REDE_SOCIAL: "Rede social",
  SITE: "Site",
  OUTRO: "Outro",
};

// Estágios terminais: uma vez aqui, o lead saiu do fluxo de negociação.
export function ehEstagioTerminal(estagio: EstagioLead): boolean {
  return estagio === "GANHO" || estagio === "PERDIDO";
}

// ---------------------------------------------------------------------------
// Agregações de BI
// ---------------------------------------------------------------------------

export interface LeadParaBI {
  estagio: EstagioLead;
  origem: OrigemLead;
  nicho: string;
  valorPotencialCentavos: number | null;
  valorFechadoCentavos: number | null;
  motivoPerdaDescricao: string | null;
}

export interface MetricasComerciais {
  total: number;
  emAberto: number;
  ganhos: number;
  perdidos: number;
  // Percentual 0–100. Base = leads já decididos (ganhos + perdidos); leads
  // ainda em aberto não entram, pra taxa não afundar só porque o funil está
  // cheio. Null quando nada foi decidido ainda (evita 0/0).
  taxaConversao: number | null;
  valorGanhoCentavos: number;
  valorEmAbertoCentavos: number;
  // Ticket médio dos leads ganhos (valorFechado). Null sem nenhum ganho.
  ticketMedioCentavos: number | null;
}

export function calcularMetricas(leads: LeadParaBI[]): MetricasComerciais {
  let ganhos = 0;
  let perdidos = 0;
  let emAberto = 0;
  let valorGanhoCentavos = 0;
  let valorEmAbertoCentavos = 0;

  for (const lead of leads) {
    if (lead.estagio === "GANHO") {
      ganhos += 1;
      valorGanhoCentavos += lead.valorFechadoCentavos ?? lead.valorPotencialCentavos ?? 0;
    } else if (lead.estagio === "PERDIDO") {
      perdidos += 1;
    } else {
      emAberto += 1;
      valorEmAbertoCentavos += lead.valorPotencialCentavos ?? 0;
    }
  }

  const decididos = ganhos + perdidos;
  const taxaConversao = decididos === 0 ? null : Math.round((ganhos / decididos) * 1000) / 10;
  const ticketMedioCentavos = ganhos === 0 ? null : Math.round(valorGanhoCentavos / ganhos);

  return {
    total: leads.length,
    emAberto,
    ganhos,
    perdidos,
    taxaConversao,
    valorGanhoCentavos,
    valorEmAbertoCentavos,
    ticketMedioCentavos,
  };
}

export interface DegrauFunil {
  estagio: EstagioLead;
  rotulo: string;
  tom: MetaEstagio["tom"];
  // Leads cujo estágio ATUAL é exatamente este.
  quantidadeNoEstagio: number;
  // Leads que alcançaram ao menos este estágio (chegaram aqui ou passaram
  // adiante). É a contagem que dá o formato de funil. Leads PERDIDOS não
  // entram: sem histórico de estágio, não dá pra saber até onde avançaram
  // antes de cair — inventar isso violaria "nunca chutar dado".
  quantidadeAlcancou: number;
}

export function calcularFunil(leads: LeadParaBI[]): DegrauFunil[] {
  return ESTAGIOS_PIPELINE.map((meta) => {
    const idxDegrau = INDICE_ESTAGIO[meta.estagio];
    let quantidadeNoEstagio = 0;
    let quantidadeAlcancou = 0;
    for (const lead of leads) {
      if (lead.estagio === meta.estagio) quantidadeNoEstagio += 1;
      const idxLead = INDICE_ESTAGIO[lead.estagio];
      if (idxLead >= idxDegrau) quantidadeAlcancou += 1;
    }
    return {
      estagio: meta.estagio,
      rotulo: meta.rotulo,
      tom: meta.tom,
      quantidadeNoEstagio,
      quantidadeAlcancou,
    };
  });
}

export interface MotivoRanking {
  motivo: string;
  quantidade: number;
}

// Ranking de "por que perdemos", do mais frequente ao menos. Leads perdidos
// sem motivo registrado entram como "Sem motivo informado" pra não sumirem da
// conta.
export function rankingMotivosPerda(leads: LeadParaBI[]): MotivoRanking[] {
  const contagem = new Map<string, number>();
  for (const lead of leads) {
    if (lead.estagio !== "PERDIDO") continue;
    const chave = lead.motivoPerdaDescricao ?? "Sem motivo informado";
    contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
  }
  return Array.from(contagem.entries())
    .map(([motivo, quantidade]) => ({ motivo, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade || a.motivo.localeCompare(b.motivo, "pt-BR"));
}

export interface DesempenhoNicho {
  nicho: string;
  total: number;
  ganhos: number;
  perdidos: number;
  taxaConversao: number | null;
  valorGanhoCentavos: number;
}

// Fatia o desempenho por nicho de mercado — é o corte que o usuário pediu
// pra saber em quais segmentos vale a pena insistir. Ordenado por mais leads.
export function desempenhoPorNicho(leads: LeadParaBI[]): DesempenhoNicho[] {
  const mapa = new Map<string, DesempenhoNicho>();
  for (const lead of leads) {
    const nicho = lead.nicho.trim() || "Sem nicho";
    const atual =
      mapa.get(nicho) ??
      ({
        nicho,
        total: 0,
        ganhos: 0,
        perdidos: 0,
        taxaConversao: null,
        valorGanhoCentavos: 0,
      } satisfies DesempenhoNicho);
    atual.total += 1;
    if (lead.estagio === "GANHO") {
      atual.ganhos += 1;
      atual.valorGanhoCentavos += lead.valorFechadoCentavos ?? lead.valorPotencialCentavos ?? 0;
    } else if (lead.estagio === "PERDIDO") {
      atual.perdidos += 1;
    }
    mapa.set(nicho, atual);
  }
  const itens = Array.from(mapa.values());
  for (const item of itens) {
    const decididos = item.ganhos + item.perdidos;
    item.taxaConversao = decididos === 0 ? null : Math.round((item.ganhos / decididos) * 1000) / 10;
  }
  return itens.sort((a, b) => b.total - a.total || a.nicho.localeCompare(b.nicho, "pt-BR"));
}
