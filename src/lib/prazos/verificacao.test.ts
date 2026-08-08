import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { verificarPrazo } from "./verificacao";

function data(ano: number, mes: number, dia: number): Date {
  return new Date(Date.UTC(ano, mes - 1, dia));
}

describe("verificarPrazo", () => {
  const sufixo = randomUUID().slice(0, 8);
  const tipoAto = `verificacao-teste-${sufixo}`;
  const uf = `Z9-${sufixo}`;
  const disponibilizacao = data(2026, 3, 2); // segunda-feira
  const anosDaJanela = [2026, 2027, 2028];

  const processo = { uf, tribunal: "TJ-TESTE", prazoEmDobro: false };
  const publicacao = { dataDisponibilizacao: disponibilizacao };

  beforeAll(async () => {
    await prisma.tipoAtoPrazo.create({
      data: { tipoAto, diasPrazo: 4, contagemDiasUteis: true, descricao: "Fixture de teste" },
    });
    await prisma.revisaoFeriadosUf.createMany({
      data: anosDaJanela.map((ano) => ({ uf, ano, revisado: true })),
    });
  });

  afterAll(async () => {
    await prisma.tipoAtoPrazo.delete({ where: { tipoAto } });
    await prisma.revisaoFeriadosUf.deleteMany({ where: { uf } });
    await prisma.feriadoForense.deleteMany({ where: { uf } });
  });

  it("CONFERIDO quando o recalculo bate com o valor salvo", async () => {
    // dataFatal/diasPrazo "salvos" são exatamente o que o motor produziria
    // hoje com os mesmos dados de entrada — nada mudou desde a criação.
    const original = await import("./motor").then((m) =>
      m.calcularPrazoParaProcesso({ tipoAto, dataDisponibilizacao: disponibilizacao, ...processo }),
    );
    expect(original.status).toBe("CALCULADO");
    if (original.status !== "CALCULADO") return;

    const resultado = await verificarPrazo(
      { tipoAto, dataFatal: original.dataFatal, diasPrazo: original.diasPrazo },
      publicacao,
      processo,
    );

    expect(resultado.status).toBe("CONFERIDO");
  });

  it("DIVERGENTE quando o valor salvo nao bate mais com o recalculo (ex.: config de dias mudou)", async () => {
    const original = await import("./motor").then((m) =>
      m.calcularPrazoParaProcesso({ tipoAto, dataDisponibilizacao: disponibilizacao, ...processo }),
    );
    expect(original.status).toBe("CALCULADO");
    if (original.status !== "CALCULADO") return;

    // Simula um Prazo salvo com uma data fatal diferente da que o motor
    // calcularia hoje (ex.: feriado corrigido depois da criação do prazo).
    const dataFatalDesatualizada = new Date(original.dataFatal.getTime() + 24 * 60 * 60 * 1000);

    const resultado = await verificarPrazo(
      { tipoAto, dataFatal: dataFatalDesatualizada, diasPrazo: original.diasPrazo },
      publicacao,
      processo,
    );

    expect(resultado.status).toBe("DIVERGENTE");
    if (resultado.status !== "DIVERGENTE") return;
    expect(resultado.dataFatalRecalculada.getTime()).toBe(original.dataFatal.getTime());
  });

  it("NAO_CONFERIVEL quando o tipo de ato nao esta mais mapeado", async () => {
    const resultado = await verificarPrazo(
      { tipoAto: `tipo-removido-${sufixo}`, dataFatal: disponibilizacao, diasPrazo: 4 },
      publicacao,
      processo,
    );

    expect(resultado.status).toBe("NAO_CONFERIVEL");
  });
});
