import { describe, expect, it } from "vitest";
import { chaveDiaSaoPaulo, situacaoPasso, visitasPorDia } from "./atividade";

describe("chaveDiaSaoPaulo", () => {
  it("usa o dia no fuso de São Paulo, não em UTC", () => {
    // 2026-08-15 01:00 UTC = 2026-08-14 22:00 em São Paulo (UTC-3)
    const instante = new Date("2026-08-15T01:00:00Z");
    expect(chaveDiaSaoPaulo(instante)).toBe("2026-08-14");
  });
});

describe("visitasPorDia", () => {
  it("gera série contínua preenchendo dias sem visita com zero", () => {
    const referencia = new Date("2026-08-14T12:00:00Z");
    const serie = visitasPorDia(
      [
        { dataVisita: new Date("2026-08-14T13:00:00Z") },
        { dataVisita: new Date("2026-08-14T18:00:00Z") },
        { dataVisita: new Date("2026-08-12T13:00:00Z") },
      ],
      3,
      referencia,
    );
    expect(serie).toEqual([
      { dia: "2026-08-12", quantidade: 1 },
      { dia: "2026-08-13", quantidade: 0 },
      { dia: "2026-08-14", quantidade: 2 },
    ]);
  });
});

describe("situacaoPasso", () => {
  const hoje = new Date("2026-08-14T12:00:00Z");

  it("classifica passo pendente com data passada como vencido", () => {
    expect(situacaoPasso({ dataPrevista: new Date("2026-08-10T12:00:00Z"), status: "PENDENTE" }, hoje)).toBe("vencido");
  });

  it("classifica passo pendente para hoje como hoje", () => {
    expect(situacaoPasso({ dataPrevista: new Date("2026-08-14T23:00:00Z"), status: "PENDENTE" }, hoje)).toBe("hoje");
  });

  it("classifica passo pendente futuro como futuro", () => {
    expect(situacaoPasso({ dataPrevista: new Date("2026-08-20T12:00:00Z"), status: "PENDENTE" }, hoje)).toBe("futuro");
  });

  it("passo concluído não tem situação temporal", () => {
    expect(situacaoPasso({ dataPrevista: new Date("2026-08-10T12:00:00Z"), status: "CONCLUIDO" }, hoje)).toBeNull();
  });
});
