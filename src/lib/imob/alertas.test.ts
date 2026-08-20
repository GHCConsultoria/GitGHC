import { describe, expect, it } from "vitest";
import { calcularAlertaVencimento } from "./alertas";

// data-base fixa para determinismo (meio-dia UTC de 2026-08-20)
const hoje = new Date("2026-08-20T12:00:00Z");

function emDias(n: number): Date {
  return new Date(hoje.getTime() + n * 86_400_000);
}

describe("calcularAlertaVencimento", () => {
  it("fora de qualquer faixa não gera alerta", () => {
    const a = calcularAlertaVencimento(emDias(60), hoje);
    expect(a.emAlerta).toBe(false);
    expect(a.faixa).toBeNull();
    expect(a.diasRestantes).toBe(60);
  });

  it("dentro de 30 dias entra na faixa 30", () => {
    const a = calcularAlertaVencimento(emDias(20), hoje);
    expect(a.faixa).toBe(30);
    expect(a.emAlerta).toBe(true);
  });

  it("a faixa retornada é a mais urgente atingida", () => {
    expect(calcularAlertaVencimento(emDias(7), hoje).faixa).toBe(7);
    expect(calcularAlertaVencimento(emDias(1), hoje).faixa).toBe(1);
    expect(calcularAlertaVencimento(emDias(5), hoje).faixa).toBe(7);
    expect(calcularAlertaVencimento(emDias(10), hoje).faixa).toBe(15);
  });

  it("contrato vencido é sinalizado (faixa 0, dias negativos)", () => {
    const a = calcularAlertaVencimento(emDias(-3), hoje);
    expect(a.vencido).toBe(true);
    expect(a.faixa).toBe(0);
    expect(a.diasRestantes).toBe(-3);
  });

  it("vence hoje conta como 0 dias, dentro da faixa 1", () => {
    const a = calcularAlertaVencimento(emDias(0), hoje);
    expect(a.vencido).toBe(false);
    expect(a.diasRestantes).toBe(0);
    expect(a.faixa).toBe(1);
  });

  it("aceita faixas customizadas", () => {
    const a = calcularAlertaVencimento(emDias(45), hoje, [60, 45, 20]);
    expect(a.faixa).toBe(45);
  });
});
