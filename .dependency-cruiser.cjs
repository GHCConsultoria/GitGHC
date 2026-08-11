/**
 * Contrato de arquitetura: valida as regras já declaradas em CLAUDE.md
 * ("preferir funções puras pra lógica de negócio", domínio sem I/O de rota).
 * Rodar com `npm run arch:check`.
 */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Dependência circular indica acoplamento indevido entre módulos.",
      from: {},
      to: { circular: true },
    },
    {
      name: "dominio-nao-depende-de-rota",
      severity: "error",
      comment: "src/lib é a camada de domínio (cálculo de prazo, providers, etc.) — não pode depender de src/app.",
      from: { path: "^src/lib" },
      to: { path: "^src/app" },
    },
    {
      name: "nao-importar-arquivo-de-teste",
      severity: "error",
      comment: "Código de produção não deve importar arquivo de teste.",
      from: { pathNot: "\\.test\\.(ts|tsx)$" },
      to: { path: "\\.test\\.(ts|tsx)$" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
