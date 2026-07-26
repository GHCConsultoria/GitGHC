import { describe, expect, it } from "vitest";
import { formatarDataCalendario } from "./formatacao";

describe("formatarDataCalendario", () => {
  it("nao desloca o dia por causa do fuso horario (regressao: meia-noite UTC nao pode virar o dia anterior)", () => {
    // Se isto usasse Intl.DateTimeFormat com timeZone America/Sao_Paulo,
    // meia-noite UTC de 01/01 cairia às 21h de 31/12 no fuso local — exatamente
    // o bug que apareceu na tela de feriados (Confraternização Universal
    // mostrando 31/12 em vez de 01/01).
    const primeiroDeJaneiro = new Date(Date.UTC(2026, 0, 1));
    expect(formatarDataCalendario(primeiroDeJaneiro)).toBe("01/01/2026");
  });

  it("formata corretamente uma data fatal qualquer", () => {
    const dataFatal = new Date(Date.UTC(2026, 6, 28));
    expect(formatarDataCalendario(dataFatal)).toBe("28/07/2026");
  });

  it("aceita string ISO", () => {
    expect(formatarDataCalendario("2026-12-31T00:00:00.000Z")).toBe("31/12/2026");
  });
});
