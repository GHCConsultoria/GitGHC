import { describe, expect, it } from "vitest";
import { filtrarNavegacao, ITENS_NAV } from "./navegacao";
import { PERMISSAO_TOTAL } from "./rbac";

describe("filtrarNavegacao", () => {
  it("sempre mostra os itens sem permissão exigida", () => {
    const nav = filtrarNavegacao([]);
    expect(nav.map((i) => i.href)).toContain("/imob");
  });

  it("esconde itens cuja permissão o papel não tem", () => {
    const nav = filtrarNavegacao(["usuarios.ver"]);
    const hrefs = nav.map((i) => i.href);
    expect(hrefs).toContain("/imob/usuarios");
    expect(hrefs).not.toContain("/imob/auditoria");
    expect(hrefs).not.toContain("/imob/papeis");
  });

  it("com acesso total, mostra todos os itens", () => {
    const nav = filtrarNavegacao([PERMISSAO_TOTAL]);
    expect(nav).toHaveLength(ITENS_NAV.length);
  });
});
