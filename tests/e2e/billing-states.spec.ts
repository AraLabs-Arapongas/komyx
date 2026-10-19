import { test, expect } from "@playwright/test";
import { login } from "./helpers";

/** The seed buffets of supabase/seeds/billing-states.sql: one per subscription state, on /assinatura. */
const as = (login: string) => ({ email: `${login}@komyx.test`, password: "senha12345" });

test.describe("Página Assinatura em cada situação", () => {
  test("em dia: sem faixa, sem botão de pagar", async ({ page }) => {
    await login(page, as("emdia"));
    await expect(page.getByTestId("billing-banner")).toHaveCount(0);
    await page.goto("/assinatura");
    await expect(page.getByTestId("subscription")).toContainText("Em dia");
    await expect(page.getByTestId("subscription-status")).toContainText("Próxima cobrança");
    await expect(page.getByRole("link", { name: /^Pagar/ })).toHaveCount(0);
  });

  test("teste grátis sem CNPJ: pede os dados para assinar", async ({ page }) => {
    await login(page, as("teste"));
    await page.goto("/assinatura");
    await expect(page.getByTestId("subscription")).toContainText("Teste grátis");
    await expect(page.getByTestId("subscription")).toContainText("Para assinar, complete CNPJ/CPF");
  });

  test("vencido 1 dia: faixa amarela, ponto no menu, botão para pagar", async ({ page }) => {
    await login(page, as("vencido"));
    await expect(page.getByTestId("billing-banner")).toHaveAttribute("data-tone", "yellow");
    await expect(page.getByTestId("billing-dot")).toBeVisible();
    await page.goto("/assinatura");
    await expect(page.getByTestId("subscription")).toContainText(/Atrasada \d+ dias?/);
    await expect(page.getByTestId("subscription-status")).toContainText("para não pausar o acesso");
    await expect(page.getByTestId("subscription-status")).toContainText("Mensalidade de R$ 149,00 vencida em");
    await expect(page.getByTestId("subscription").getByRole("button", { name: /Pagar R\$\s149,00/ })).toBeVisible();
    // Late: paying comes first, no plan change.
    await expect(page.getByText("Trocar de plano")).toHaveCount(0);
  });

  test("vencido 9 dias: faixa vermelha", async ({ page }) => {
    await login(page, as("vencido9"));
    await expect(page.getByTestId("billing-banner")).toHaveAttribute("data-tone", "red");
    await page.goto("/assinatura");
    await expect(page.getByTestId("subscription-status")).toContainText("Amanhã seu acesso será pausado");
  });

  test("pausado: tela de acesso pausado", async ({ page }) => {
    await login(page, as("pausado")).catch(() => {});
    await page.goto("/home");
    await expect(page).toHaveURL(/\/pausado/);
  });

  test("troca agendada: aviso com Desfazer; planos recolhidos", async ({ page }) => {
    await login(page, as("troca"));
    await page.goto("/assinatura");
    await expect(page.getByTestId("pending-plan")).toContainText("12 meses");
    await expect(page.locator('[data-plan="12"]')).toBeHidden();
    await page.getByText("Trocar de plano").click();
    await expect(page.locator('[data-plan="12"]')).toBeVisible();
  });

  test("cancelado: botão Pagar e reativar, sem trocar de plano", async ({ page }) => {
    await login(page, as("cancelado"));
    await page.goto("/assinatura");
    await expect(page.getByTestId("subscription")).toContainText("Cancelada");
    await expect(page.getByRole("button", { name: /Pagar R\$ 149,00 e reativar/ })).toBeVisible();
    await expect(page.getByText("Trocar de plano")).toHaveCount(0);
  });

  test("Minha conta: só o perfil e o atalho para Assinatura", async ({ page }) => {
    await login(page, as("emdia"));
    await page.goto("/conta");
    await expect(page.getByTestId("subscription")).toHaveCount(0);
    await page.getByRole("link", { name: /Assinatura/ }).last().click();
    await expect(page).toHaveURL(/\/assinatura/);
  });
});

test("pausado: botão Pagar na tela de acesso pausado, sem 'fale com a gente'", async ({ page }) => {
  await login(page, { email: "pausado@komyx.test", password: "senha12345" }).catch(() => {});
  await page.goto("/pausado");
  const pay = page.getByTestId("paused-payment");
  // Any amount: the plan may have been changed while testing.
  await expect(pay.getByRole("button", { name: /^Pagar R\$/ }).or(pay.getByRole("link", { name: /^Pagar R\$.* e voltar/ })).first()).toBeVisible();
  await expect(pay).not.toContainText("Fale com a gente para receber");
});

test("atrasado: os outros planos aparecem abertos abaixo do Pagar", async ({ page }) => {
  await login(page, { email: "vencido@komyx.test", password: "senha12345" });
  await page.goto("/assinatura");
  await expect(page.getByText("Ou mude o plano")).toBeVisible();
  const sw = page.getByTestId("late-plan-switch");
  for (const t of ["3 meses · R$ 402,00", "6 meses · R$ 714,00", "12 meses · R$ 1.188,00"]) await expect(sw.getByRole("button", { name: new RegExp(t.replace(/[.$]/g, "\\$&")) })).toBeVisible();
  await expect(sw.getByRole("button", { name: /Mensal/ })).toHaveCount(0);
});
