import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    // "e2e/**" tem os testes do Playwright (mesmo padrão *.spec.ts) — sem
    // isso o Vitest tenta rodar eles tambem e colide com o runner do Playwright.
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
