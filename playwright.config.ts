import { defineConfig, devices } from "@playwright/test";

/**
 * Sobe o próprio `next dev` contra o Postgres já migrado/semeado (ver CI e
 * README) e roda como o "Advogado Demo" — sem Supabase configurado, o app
 * cai no fallback de usuário demo (ver src/lib/auth.ts), então não precisa
 * de login pros smoke tests.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
