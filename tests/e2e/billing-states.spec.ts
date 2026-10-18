import { test, expect } from "@playwright/test";
import { login } from "./helpers";

/** The seed buffets of supabase/seeds/billing-states.sql: one per subscription state. */
const as = (login: string) => ({ email: `${login}@komyx.test`, password: "senha12345" });

test.describe("Buffets de teste por situação da assinatura", () => {
  test("em dia: sem faixa; assinatura sem bloco de pagamento", async ({ page }) => {
    await login(page, as("emdia"));
    await expect(page.getByTestId("billing-banner")).toHaveCount(0);
    await page.goto("/conta");
    await expect(page.getByTestId("pay-invoice")).toHaveCount(0);
    await expect(page.getByTestId("change-plan")).not.toHaveAttribute("open", "");
  });

  test("teste grátis: faixa pede os dados", async ({ page }) => {
    await login(page, as("teste"));
    await expect(page.getByTestId("billing-banner")).toHaveAttribute("data-tone", "trial");
  });

  test("vencido 1 dia: faixa amarela e Pagar em Minha conta; barra lateral atrasada", async ({ page }) => {
    await login(page, as("vencido"));
    await expect(page.getByTestId("billing-banner")).toHaveAttribute("data-tone", "yellow");
    await expect(page.getByText("Atrasada 1 dia").first()).toBeVisible();
    await page.goto("/conta");
    await expect(page.getByTestId("pay-invoice")).toContainText("vencida em");
  });

  test("vencido 9 dias: faixa vermelha", async ({ page }) => {
    await login(page, as("vencido9"));
    await expect(page.getByTestId("billing-banner")).toHaveAttribute("data-tone", "red");
  });

  test("pausado: tela de acesso pausado", async ({ page }) => {
    await login(page, as("pausado")).catch(() => {});
    await page.goto("/home");
    await expect(page).toHaveURL(/\/pausado/);
  });

  test("troca agendada: aviso com Desfazer", async ({ page }) => {
    await login(page, as("troca"));
    await page.goto("/conta");
    await expect(page.getByTestId("pending-plan")).toContainText("12 meses");
  });
});
