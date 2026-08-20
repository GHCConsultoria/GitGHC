import { describe, expect, it } from "vitest";
import { fluxoPorMes, type LancamentoFluxo, resumoFluxoCaixa } from "./fluxo";

const lancamentos: LancamentoFluxo[] = [
  { tipo: "RECEBER", status: "PAGO", valor: 100000, pagamentoEm: new Date("2026-08-05T12:00:00Z") },
  { tipo: "RECEBER", status: "PAGO", valor: 50000, pagamentoEm: new Date("2026-08-20T12:00:00Z") },
  { tipo: "PAGAR", status: "PAGO", valor: 30000, pagamentoEm: new Date("2026-08-10T12:00:00Z") },
  { tipo: "RECEBER", status: "PENDENTE", valor: 200000, pagamentoEm: null },
  { tipo: "PAGAR", status: "PENDENTE", valor: 40000, pagamentoEm: null },
  { tipo: "RECEBER", status: "CANCELADO", valor: 999999, pagamentoEm: null },
];

describe("resumoFluxoCaixa", () => {
  it("soma entradas e saídas pagas e calcula o saldo", () => {
    const r = resumoFluxoCaixa(lancamentos, 10000);
    expect(r.entradas).toBe(150000);
    expect(r.saidas).toBe(30000);
    expect(r.saldoInicial).toBe(10000);
    expect(r.saldoFinal).toBe(10000 + 150000 - 30000);
  });

  it("separa os pendentes em a receber / a pagar", () => {
    const r = resumoFluxoCaixa(lancamentos);
    expect(r.aReceber).toBe(200000);
    expect(r.aPagar).toBe(40000);
  });

  it("ignora cancelados", () => {
    const r = resumoFluxoCaixa(lancamentos);
    expect(r.entradas).not.toContain(999999);
    expect(r.saldoFinal).toBe(120000);
  });
});

describe("fluxoPorMes", () => {
  it("agrupa por mês só o que foi pago", () => {
    const meses = fluxoPorMes(lancamentos);
    expect(meses).toHaveLength(1);
    expect(meses[0]).toEqual({ mes: "2026-08", entradas: 150000, saidas: 30000 });
  });
});
