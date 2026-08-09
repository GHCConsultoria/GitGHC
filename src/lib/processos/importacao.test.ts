import { describe, expect, it } from "vitest";
import { parseCsvProcessos, MODELO_CSV_PROCESSOS } from "./importacao";

describe("parseCsvProcessos", () => {
  it("interpreta o próprio template como válido", () => {
    const resultado = parseCsvProcessos(MODELO_CSV_PROCESSOS);
    expect(resultado.status).toBe("ok");
    if (resultado.status !== "ok") return;
    expect(resultado.linhas).toHaveLength(1);
    expect(resultado.linhas[0]).toMatchObject({
      linha: 2,
      status: "valida",
      dados: { numeroCnj: "12345678920258260100", cliente: "João da Silva", uf: "SP", parteRepresentada: "AUTOR", prazoEmDobro: false },
    });
  });

  it("rejeita cabeçalho incorreto", () => {
    const resultado = parseCsvProcessos("a,b,c\n1,2,3");
    expect(resultado.status).toBe("cabecalho_invalido");
  });

  it("aceita campos entre aspas com vírgula interna", () => {
    const csv = [
      "numeroCnj,cliente,varaOrgao,uf,tribunal,parteRepresentada,prazoEmDobro",
      '1234567-89.2025.8.26.0100,"Silva, João",1ª Vara,SP,TJSP,AUTOR,sim',
    ].join("\n");
    const resultado = parseCsvProcessos(csv);
    expect(resultado.status).toBe("ok");
    if (resultado.status !== "ok") return;
    expect(resultado.linhas[0]).toMatchObject({ status: "valida", dados: { cliente: "Silva, João", prazoEmDobro: true } });
  });

  it("marca linha com UF inválida como inválida sem afetar as outras", () => {
    const csv = [
      "numeroCnj,cliente,varaOrgao,uf,tribunal,parteRepresentada,prazoEmDobro",
      "1234567-89.2025.8.26.0100,Cliente A,Vara,XX,TJSP,AUTOR,não",
      "1234567-89.2025.8.26.0101,Cliente B,Vara,SP,TJSP,REU,não",
    ].join("\n");
    const resultado = parseCsvProcessos(csv);
    expect(resultado.status).toBe("ok");
    if (resultado.status !== "ok") return;
    expect(resultado.linhas[0].status).toBe("invalida");
    expect(resultado.linhas[1].status).toBe("valida");
  });

  it("marca CNJ com menos de 20 dígitos como inválido", () => {
    const csv = [
      "numeroCnj,cliente,varaOrgao,uf,tribunal,parteRepresentada,prazoEmDobro",
      "123,Cliente A,Vara,SP,TJSP,AUTOR,não",
    ].join("\n");
    const resultado = parseCsvProcessos(csv);
    expect(resultado.status).toBe("ok");
    if (resultado.status !== "ok") return;
    expect(resultado.linhas[0].status).toBe("invalida");
  });
});
