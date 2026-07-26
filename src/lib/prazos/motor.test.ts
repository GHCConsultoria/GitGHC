import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { calcularPrazoParaProcesso } from "./motor";

function data(ano: number, mes: number, dia: number): Date {
  return new Date(Date.UTC(ano, mes - 1, dia));
}

describe("calcularPrazoParaProcesso", () => {
  const sufixo = randomUUID().slice(0, 8);
  const tipoAto = `contestacao-teste-${sufixo}`;
  // UFs ficticias para nao colidir com o calendario nacional real semeado.
  const ufRevisada = `Z1-${sufixo}`;
  const ufNaoRevisada = `Z2-${sufixo}`;
  const disponibilizacao = data(2026, 3, 2); // segunda-feira
  const anosDaJanela = [2026, 2027, 2028];

  beforeAll(async () => {
    await prisma.tipoAtoPrazo.create({
      data: { tipoAto, diasPrazo: 4, contagemDiasUteis: true, descricao: "Fixture de teste" },
    });

    await prisma.revisaoFeriadosUf.createMany({
      data: anosDaJanela.map((ano) => ({ uf: ufRevisada, ano, revisado: true })),
    });
  });

  afterAll(async () => {
    await prisma.tipoAtoPrazo.delete({ where: { tipoAto } });
    await prisma.revisaoFeriadosUf.deleteMany({ where: { uf: { in: [ufRevisada, ufNaoRevisada] } } });
    await prisma.feriadoForense.deleteMany({ where: { uf: { in: [ufRevisada, ufNaoRevisada] } } });
  });

  it("prazo em dobro dobra os dias mapeados em TipoAtoPrazo", async () => {
    const simples = await calcularPrazoParaProcesso({
      tipoAto,
      dataDisponibilizacao: disponibilizacao,
      uf: ufRevisada,
      tribunal: "TJ-TESTE",
      prazoEmDobro: false,
    });
    const dobrado = await calcularPrazoParaProcesso({
      tipoAto,
      dataDisponibilizacao: disponibilizacao,
      uf: ufRevisada,
      tribunal: "TJ-TESTE",
      prazoEmDobro: true,
    });

    expect(simples.status).toBe("CALCULADO");
    expect(dobrado.status).toBe("CALCULADO");
    if (simples.status !== "CALCULADO" || dobrado.status !== "CALCULADO") return;

    expect(simples.diasPrazo).toBe(4);
    expect(dobrado.diasPrazo).toBe(8);
    // com o dobro de dias uteis, o vencimento tem que cair depois (nunca antes)
    expect(dobrado.dataFatal.getTime()).toBeGreaterThan(simples.dataFatal.getTime());
  });

  it("tipo de ato nao mapeado vai para revisao manual, nunca um chute", async () => {
    const resultado = await calcularPrazoParaProcesso({
      tipoAto: `tipo-inexistente-${sufixo}`,
      dataDisponibilizacao: disponibilizacao,
      uf: ufRevisada,
      tribunal: "TJ-TESTE",
      prazoEmDobro: false,
    });

    expect(resultado.status).toBe("REVISAO_MANUAL");
    if (resultado.status !== "REVISAO_MANUAL") return;
    expect(resultado.alerta).toBe("TIPO_ATO_NAO_MAPEADO");
  });

  it("UF sem calendario de feriados revisado vai para revisao manual com alerta FERIADOS_NAO_REVISADOS", async () => {
    const resultado = await calcularPrazoParaProcesso({
      tipoAto,
      dataDisponibilizacao: disponibilizacao,
      uf: ufNaoRevisada,
      tribunal: "TJ-TESTE",
      prazoEmDobro: false,
    });

    expect(resultado.status).toBe("REVISAO_MANUAL");
    if (resultado.status !== "REVISAO_MANUAL") return;
    expect(resultado.alerta).toBe("FERIADOS_NAO_REVISADOS");
  });
});
