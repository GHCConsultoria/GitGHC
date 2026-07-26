import { describe, expect, it } from "vitest";
import { calcularPrazo } from "./calculo";

function data(ano: number, mes: number, dia: number): Date {
  return new Date(Date.UTC(ano, mes - 1, dia));
}

const DOMINGO = 0;
const SEGUNDA = 1;
const TERCA = 2;
const QUARTA = 3;
const QUINTA = 4;
const SEXTA = 5;
const SABADO = 6;

/** Encontra a primeira data >= referencia cujo dia da semana seja o pedido. */
function proximaDataComDiaDaSemana(referencia: Date, diaDaSemanaAlvo: number): Date {
  const candidato = new Date(referencia.getTime());
  while (candidato.getUTCDay() !== diaDaSemanaAlvo) {
    candidato.setUTCDate(candidato.getUTCDate() + 1);
  }
  return candidato;
}

describe("calcularPrazo — termo inicial (art. 224, §§2º-3º, CPC)", () => {
  it("disponibilizacao numa sexta-feira: publicacao cai na segunda, contagem comeca na terca", () => {
    const sexta = proximaDataComDiaDaSemana(data(2026, 1, 1), SEXTA);

    const resultado = calcularPrazo({
      dataDisponibilizacao: sexta,
      diasPrazo: 1,
      contagemDiasUteis: true,
      uf: "SP",
      tribunal: "TJSP",
      feriados: [],
    });

    expect(resultado.sucesso).toBe(true);
    if (!resultado.sucesso) return;

    expect(resultado.dataPublicacaoConsiderada.getUTCDay()).toBe(SEGUNDA);
    expect(resultado.dataInicioContagem.getUTCDay()).toBe(TERCA);
    expect(resultado.dataFatal.getTime()).toBe(resultado.dataInicioContagem.getTime());
  });

  it("disponibilizacao num sabado: publicacao e contagem pulam o fim de semana inteiro", () => {
    const sabado = proximaDataComDiaDaSemana(data(2026, 1, 1), SABADO);

    const resultado = calcularPrazo({
      dataDisponibilizacao: sabado,
      diasPrazo: 1,
      contagemDiasUteis: true,
      uf: "SP",
      tribunal: "TJSP",
      feriados: [],
    });

    expect(resultado.sucesso).toBe(true);
    if (!resultado.sucesso) return;

    // sabado -> domingo (nao util) -> segunda (1o dia util = publicacao)
    expect(resultado.dataPublicacaoConsiderada.getUTCDay()).toBe(SEGUNDA);
    expect(resultado.dataInicioContagem.getUTCDay()).toBe(TERCA);
  });

  it("vespera de feriado: a data que seria a publicacao e pulada quando cai em feriado cadastrado", () => {
    // disponibilizacao numa quarta; a quinta seguinte (que seria o 1o dia
    // util e viraria a "publicacao considerada") esta cadastrada como
    // feriado, entao a publicacao deve escorregar para a sexta.
    const quarta = proximaDataComDiaDaSemana(data(2026, 1, 1), QUARTA);
    const quintaSeguinte = new Date(quarta.getTime());
    quintaSeguinte.setUTCDate(quintaSeguinte.getUTCDate() + 1);
    expect(quintaSeguinte.getUTCDay()).toBe(QUINTA);

    const resultado = calcularPrazo({
      dataDisponibilizacao: quarta,
      diasPrazo: 1,
      contagemDiasUteis: true,
      uf: "SP",
      tribunal: "TJSP",
      feriados: [quintaSeguinte],
    });

    expect(resultado.sucesso).toBe(true);
    if (!resultado.sucesso) return;

    expect(resultado.dataPublicacaoConsiderada.getUTCDay()).toBe(SEXTA);
    expect(resultado.dataPublicacaoConsiderada.getTime()).toBeGreaterThan(quintaSeguinte.getTime());
  });
});

describe("calcularPrazo — contagem em dias uteis cruzando o recesso (art. 220, CPC)", () => {
  it("nao conta nenhum dia do recesso 20/12 a 20/01, mesmo em dias uteis normais", () => {
    const recesso: Date[] = [];
    const cursor = data(2026, 12, 20);
    const limite = data(2027, 1, 20);
    while (cursor.getTime() <= limite.getTime()) {
      recesso.push(new Date(cursor.getTime()));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    // disponibilizacao numa segunda antes do recesso comecar
    const disponibilizacao = data(2026, 12, 14);
    expect(disponibilizacao.getUTCDay()).toBe(SEGUNDA);

    const resultado = calcularPrazo({
      dataDisponibilizacao: disponibilizacao,
      diasPrazo: 5,
      contagemDiasUteis: true,
      uf: "SP",
      tribunal: "TJSP",
      feriados: recesso,
    });

    expect(resultado.sucesso).toBe(true);
    if (!resultado.sucesso) return;

    // nenhum dos passos contados pode cair dentro do recesso
    const recessoChaves = new Set(recesso.map((d) => d.toISOString().slice(0, 10)));
    for (const passo of resultado.passos) {
      expect(recessoChaves.has(passo.data)).toBe(false);
    }

    // a data fatal so pode vir depois do fim do recesso (21/01/2027 em diante)
    expect(resultado.dataFatal.getTime()).toBeGreaterThan(limite.getTime());
  });
});

describe("calcularPrazo — caminho de erro (nao foi possivel calcular)", () => {
  it("recusa diasPrazo zero ou negativo em vez de calcular qualquer coisa", () => {
    const resultado = calcularPrazo({
      dataDisponibilizacao: data(2026, 3, 10),
      diasPrazo: 0,
      contagemDiasUteis: true,
      uf: "SP",
      tribunal: "TJSP",
      feriados: [],
    });

    expect(resultado.sucesso).toBe(false);
    if (resultado.sucesso) return;
    expect(resultado.motivo).toMatch(/diasPrazo/);
  });

  it("recusa diasPrazo nao inteiro", () => {
    const resultado = calcularPrazo({
      dataDisponibilizacao: data(2026, 3, 10),
      diasPrazo: 15.5,
      contagemDiasUteis: true,
      uf: "SP",
      tribunal: "TJSP",
      feriados: [],
    });

    expect(resultado.sucesso).toBe(false);
  });

  it("recusa dataDisponibilizacao invalida", () => {
    const resultado = calcularPrazo({
      dataDisponibilizacao: new Date("nao-e-uma-data"),
      diasPrazo: 15,
      contagemDiasUteis: true,
      uf: "SP",
      tribunal: "TJSP",
      feriados: [],
    });

    expect(resultado.sucesso).toBe(false);
    if (resultado.sucesso) return;
    expect(resultado.motivo).toMatch(/dataDisponibilizacao/);
  });
});

describe("calcularPrazo — contagem em dias corridos", () => {
  it("protrai o vencimento quando ele cai em dia sem expediente forense", () => {
    const segunda = proximaDataComDiaDaSemana(data(2026, 1, 1), SEGUNDA);

    const resultado = calcularPrazo({
      dataDisponibilizacao: segunda,
      // publicacao: terca; inicio da contagem: quarta; +2 dias corridos = sexta (dia util, nao protrai)
      // vamos usar diasPrazo que caia num sabado para validar a protracao
      diasPrazo: 4,
      contagemDiasUteis: false,
      uf: "SP",
      tribunal: "TJSP",
      feriados: [],
    });

    expect(resultado.sucesso).toBe(true);
    if (!resultado.sucesso) return;
    expect(resultado.dataFatal.getUTCDay()).not.toBe(DOMINGO);
    expect(resultado.dataFatal.getUTCDay()).not.toBe(SABADO);
  });
});
