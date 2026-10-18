import { test, expect } from "@playwright/test";
import { ACCOUNTS, adminDb, login, uniq } from "./helpers";

/**
 * Admin: Visão geral (Atenção), Métricas and Saúde. Seeds one failed e-mail in message_log so the
 * failure shows up on both screens; the row is deleted in afterAll.
 */
test.describe("Admin métricas e saúde", () => {
  const marker = uniq("e2e-falha");
  const to = `${marker}@e2e.test`;

  test.beforeAll(async () => {
    const { error } = await adminDb().from("message_log").insert({ channel: "email", kind: "test", to_address: to, status: "failed", error: `Erro de teste ${marker}` });
    if (error) throw error;
  });

  test.afterAll(async () => {
    await adminDb().from("message_log").delete().eq("to_address", to);
  });

  test("visão geral mostra o bloco Atenção", async ({ page }) => {
    await login(page, ACCOUNTS.admin);
    await page.goto("/admin");
    await expect(page.getByText("Buffets ativos")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Atenção" })).toBeVisible();
    await expect(page.getByRole("link", { name: /falh(ou|aram) nas últimas 24h/ })).toHaveAttribute("href", "/admin/saude");
  });

  test("métricas mostra funis e a tabela de buffets", async ({ page }) => {
    await login(page, ACCOUNTS.admin);
    await page.goto("/admin/metricas");
    await expect(page.getByRole("heading", { name: "Novos buffets por semana" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Funil de ativação" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Funil de vendas" })).toBeVisible();
    await expect(page.getByText("Últimos 30 dias")).toBeVisible();
    // Real seed buffet is listed; demo buffets are not.
    await expect(page.getByRole("link", { name: "Festa & Cia Buffet" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Komyx Buffet", exact: true })).toHaveCount(0);
  });

  test("saúde mostra rotinas, falhas e configuração", async ({ page }) => {
    await login(page, ACCOUNTS.admin);
    await page.goto("/admin/saude");
    await expect(page.getByText("Libera reservas vencidas (a cada 5 min)")).toBeVisible();
    await expect(page.getByText("Reset noturno das demos (03:30)")).toBeVisible();
    await expect(page.getByText(to)).toBeVisible();
    await expect(page.getByText(`Erro de teste ${marker}`)).toBeVisible();
    await expect(page.getByRole("link", { name: "Reenviar na tela de E-mails" })).toHaveAttribute("href", "/admin/emails?status=failed");
    await expect(page.getByText("RESEND_API_KEY")).toBeVisible();
    await expect(page.getByText("SEND_SMS_HOOK_SECRET")).toBeVisible();
  });
});
