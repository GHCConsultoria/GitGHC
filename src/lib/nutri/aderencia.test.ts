import { describe, expect, it } from "vitest";
import { calcularSaldoDoDia, limitesDoDiaEmSaoPaulo } from "./aderencia";

describe("calcularSaldoDoDia", () => {
  it("soma os registros do dia e calcula o percentual contra a meta", () => {
    const saldo = calcularSaldoDoDia(
      [
        { kcal: 500, proteina: 30, carbo: 40, gordura: 10 },
        { kcal: 300, proteina: 20, carbo: 10, gordura: 5 },
      ],
      { metaKcal: 2000, metaProteina: 100, metaCarbo: 200, metaGordura: 60 },
    );

    expect(saldo.kcal).toEqual({ consumido: 800, meta: 2000, percentual: 40 });
    expect(saldo.proteina).toEqual({ consumido: 50, meta: 100, percentual: 50 });
  });

  it("sem registros, o percentual é zero, não NaN", () => {
    const saldo = calcularSaldoDoDia([], { metaKcal: 2000, metaProteina: 100, metaCarbo: 200, metaGordura: 60 });
    expect(saldo.kcal).toEqual({ consumido: 0, meta: 2000, percentual: 0 });
  });
});

describe("limitesDoDiaEmSaoPaulo", () => {
  it("21h UTC (18h em SP) fica no mesmo dia local, não no dia seguinte", () => {
    const referencia = new Date("2026-03-10T21:00:00.000Z");
    const { inicio, fim } = limitesDoDiaEmSaoPaulo(referencia);

    // Meia-noite de 10/03 em America/Sao_Paulo (UTC-3) é 2026-03-10T03:00:00Z.
    expect(inicio.toISOString()).toBe("2026-03-10T03:00:00.000Z");
    expect(fim.toISOString()).toBe("2026-03-11T03:00:00.000Z");
    expect(referencia >= inicio && referencia < fim).toBe(true);
  });

  it("madrugada UTC que ainda é o dia anterior em SP cai no dia anterior", () => {
    // 2026-03-11T01:00:00Z é 2026-03-10T22:00 em America/Sao_Paulo.
    const referencia = new Date("2026-03-11T01:00:00.000Z");
    const { inicio, fim } = limitesDoDiaEmSaoPaulo(referencia);

    expect(inicio.toISOString()).toBe("2026-03-10T03:00:00.000Z");
    expect(fim.toISOString()).toBe("2026-03-11T03:00:00.000Z");
  });
});
