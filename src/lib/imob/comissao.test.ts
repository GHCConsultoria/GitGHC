import { describe, expect, it } from "vitest";
import { calcularComissao, DistribuicaoInvalidaError, distribuicaoValida } from "./comissao";

describe("calcularComissao", () => {
  it("calcula a comissão total e reparte 50/50", () => {
    // Venda de R$ 500.000, comissão 6% = R$ 30.000
    const r = calcularComissao(50000000, 6, { corretorVendedor: 50, corretorCaptador: 0, gerente: 0, imobiliaria: 50 });
    expect(r.comissaoTotal).toBe(3000000);
    expect(r.partes.corretorVendedor).toBe(1500000);
    expect(r.partes.imobiliaria).toBe(1500000);
    expect(r.partes.corretorCaptador).toBe(0);
    expect(r.partes.gerente).toBe(0);
  });

  it("a soma das partes é sempre igual ao total (sem perder centavos)", () => {
    // valor/percentuais escolhidos para forçar arredondamento
    const r = calcularComissao(33333, 7, { corretorVendedor: 33, corretorCaptador: 33, gerente: 0, imobiliaria: 34 });
    const soma = r.partes.corretorVendedor + r.partes.corretorCaptador + r.partes.gerente + r.partes.imobiliaria;
    expect(soma).toBe(r.comissaoTotal);
  });

  it("distribui os centavos restantes para as maiores frações", () => {
    // total 100 centavos, 3 vias iguais (33,33 cada) → 34/33/33
    const r = calcularComissao(10000, 1, {
      corretorVendedor: 33.33,
      corretorCaptador: 33.33,
      gerente: 33.34,
      imobiliaria: 0,
    });
    const soma = r.partes.corretorVendedor + r.partes.corretorCaptador + r.partes.gerente;
    expect(soma).toBe(r.comissaoTotal);
    expect(r.comissaoTotal).toBe(100);
  });

  it("rejeita distribuição que não soma 100", () => {
    expect(() =>
      calcularComissao(1000, 5, { corretorVendedor: 50, corretorCaptador: 0, gerente: 0, imobiliaria: 40 }),
    ).toThrow(DistribuicaoInvalidaError);
  });
});

describe("distribuicaoValida", () => {
  it("aceita soma 100", () => {
    expect(distribuicaoValida({ corretorVendedor: 60, corretorCaptador: 10, gerente: 10, imobiliaria: 20 })).toBe(true);
  });
  it("rejeita soma diferente de 100", () => {
    expect(distribuicaoValida({ corretorVendedor: 60, corretorCaptador: 10, gerente: 10, imobiliaria: 10 })).toBe(
      false,
    );
  });
});
