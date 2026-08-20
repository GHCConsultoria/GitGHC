import { describe, expect, it } from "vitest";
import {
  CATALOGO_PERMISSOES,
  exigirPermissao,
  PAPEIS_PADRAO,
  PERMISSAO_TOTAL,
  PERMISSOES_VALIDAS,
  PermissaoNegadaError,
  sanitizarPermissoes,
  temPermissao,
} from "./rbac";

describe("temPermissao", () => {
  it("concede quando a permissão está na lista", () => {
    expect(temPermissao(["imoveis.ver", "imoveis.criar"], "imoveis.ver")).toBe(true);
  });

  it("nega quando a permissão não está na lista", () => {
    expect(temPermissao(["imoveis.ver"], "imoveis.excluir")).toBe(false);
  });

  it("o curinga concede qualquer permissão", () => {
    expect(temPermissao([PERMISSAO_TOTAL], "financeiro.excluir")).toBe(true);
    expect(temPermissao([PERMISSAO_TOTAL], "qualquer.coisa")).toBe(true);
  });

  it("lista vazia nega tudo", () => {
    expect(temPermissao([], "imoveis.ver")).toBe(false);
  });
});

describe("exigirPermissao", () => {
  it("não lança quando tem permissão", () => {
    expect(() => exigirPermissao(["papeis.editar"], "papeis.editar")).not.toThrow();
  });

  it("lança PermissaoNegadaError quando falta", () => {
    expect(() => exigirPermissao(["imoveis.ver"], "usuarios.criar")).toThrow(PermissaoNegadaError);
  });
});

describe("sanitizarPermissoes", () => {
  it("remove chaves fora do catálogo", () => {
    const limpo = sanitizarPermissoes(["imoveis.ver", "chave.inventada", "usuarios.criar"]);
    expect(limpo).toEqual(["imoveis.ver", "usuarios.criar"]);
  });

  it("mantém o curinga", () => {
    expect(sanitizarPermissoes([PERMISSAO_TOTAL])).toEqual([PERMISSAO_TOTAL]);
  });

  it("deduplica preservando ordem", () => {
    expect(sanitizarPermissoes(["clientes.ver", "clientes.ver", "leads.ver"])).toEqual(["clientes.ver", "leads.ver"]);
  });
});

describe("catálogo e papéis padrão", () => {
  it("não tem chaves de permissão duplicadas", () => {
    const chaves = CATALOGO_PERMISSOES.map((p) => p.chave);
    expect(new Set(chaves).size).toBe(chaves.length);
  });

  it("todo papel padrão só usa chaves válidas (ou o curinga)", () => {
    for (const papel of PAPEIS_PADRAO) {
      for (const chave of papel.permissoes) {
        const valida = chave === PERMISSAO_TOTAL || PERMISSOES_VALIDAS.has(chave);
        expect(valida, `${papel.nome} referencia chave inválida: ${chave}`).toBe(true);
      }
    }
  });

  it("existe exatamente um Administrador com acesso total", () => {
    const admins = PAPEIS_PADRAO.filter((p) => p.permissoes.includes(PERMISSAO_TOTAL));
    expect(admins).toHaveLength(1);
    expect(admins[0]?.nome).toBe("Administrador");
  });

  it("papéis não-admin não recebem gestão de usuários", () => {
    for (const papel of PAPEIS_PADRAO) {
      if (papel.nome === "Administrador") continue;
      expect(papel.permissoes).not.toContain("usuarios.criar");
    }
  });
});
