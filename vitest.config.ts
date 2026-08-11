import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    // "e2e/**" tem os testes do Playwright (mesmo padrão *.spec.ts) — sem
    // isso o Vitest tenta rodar eles tambem e colide com o runner do Playwright.
    exclude: [...configDefaults.exclude, "e2e/**"],
    coverage: {
      provider: "v8",
      // lcov é o formato que o Codecov autodetecta sozinho — sem isso ele
      // não achava relatório nenhum pra subir, mesmo com token válido.
      reporter: ["text", "lcov"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
