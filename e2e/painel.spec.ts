import { expect, test } from "@playwright/test";

test.describe("Painel principal", () => {
  test("carrega o dashboard com a sidebar e o resumo de prazos", async ({ page }) => {
    await page.goto("/");

    // "GitGHC" aparece duas vezes no DOM (sidebar de desktop e o drawer
    // mobile, um deles sempre oculto por CSS conforme o viewport) — checar
    // o cabeçalho da página e um link da sidebar já confirma que carregou.
    await expect(page.getByRole("heading", { name: /Publicações/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Painel de saúde" })).toBeVisible();
  });

  test("navega até o Painel de saúde pela sidebar", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: "Painel de saúde" }).click();

    await expect(page).toHaveURL(/\/saude$/);
    await expect(page.getByRole("heading", { name: "Painel de saúde" })).toBeVisible();
  });
});
