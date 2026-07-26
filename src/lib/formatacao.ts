const TIME_ZONE = "America/Sao_Paulo";

/**
 * Formata uma Date que representa um DIA-CALENDÁRIO — a convenção deste
 * projeto para datas sem hora significativa (dataFatal, dataDisponibilizacao,
 * feriados: sempre meia-noite UTC representando o dia). NÃO faz conversão de
 * fuso horário: fazer isso deslocaria o dia, porque meia-noite UTC cai às 21h
 * do dia anterior em America/Sao_Paulo — foi exatamente esse bug que já foi
 * corrigido no motor de cálculo (src/lib/prazos/calculo.ts) e se repetiu aqui
 * na exibição. Para um instante de verdade (timestamp com hora relevante,
 * como executadoEm/criadoEm), use formatarDataHora.
 */
export function formatarDataCalendario(data: Date | string): string {
  const instante = typeof data === "string" ? new Date(data) : data;
  const dia = String(instante.getUTCDate()).padStart(2, "0");
  const mes = String(instante.getUTCMonth() + 1).padStart(2, "0");
  const ano = instante.getUTCFullYear();
  return `${dia}/${mes}/${ano}`;
}

/** Formata um instante de verdade (com hora relevante) em America/Sao_Paulo. */
export function formatarDataHora(data: Date | string): string {
  const instante = typeof data === "string" ? new Date(data) : data;
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    dateStyle: "short",
    timeStyle: "short",
  }).format(instante);
}
