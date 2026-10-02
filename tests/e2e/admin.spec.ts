import { test, expect } from "@playwright/test";
import { ACCOUNTS, cleanupOrgBySlug, login, logout, uniq } from "./helpers";

/**
 * Admin da plataforma: cria buffet + dono, suspende (app e página pública bloqueiam), reativa.
 * The org and its owner are deleted in afterAll.
 */
test.describe("Admin Komyx", () => {
  const slug = uniq("e2e-buffet");
  const ownerEmail = `${slug}@e2e.test`;

  test.afterAll(async () => {
    await cleanupOrgBySlug(slug);
  });

  test("dono comum não entra no admin", async ({ page }) => {
    await login(page, ACCOUNTS.owner);
    await page.goto("/admin");
    await page.waitForURL(/\/home\?error=forbidden/);
  });

  test("cria buffet, suspende e reativa", async ({ page }) => {
    await login(page, ACCOUNTS.admin);
    await page.goto("/admin");
    await expect(page.getByText("Buffets ativos")).toBeVisible();

    await page.goto("/admin/buffets/novo");
    await page.getByLabel("Nome do buffet").fill("Buffet E2E");
    await page.getByLabel("Slug (opcional)").fill(slug);
    await page.getByLabel("Plano").selectOption("premium");
    await page.getByLabel("Nome", { exact: true }).fill("Dono E2E");
    await page.getByLabel("E-mail").fill(ownerEmail);
    await page.getByLabel("Senha inicial").fill("senha12345");
    await page.getByRole("button", { name: "Criar buffet e acesso" }).click();
    await page.waitForURL(/\/admin\/buffets\/[0-9a-f-]+\?created=1/);
    await expect(page.getByText("Buffet criado")).toBeVisible();
    await expect(page.getByText("Dono E2E")).toBeVisible();
    await expect(page.getByText("Responsável", { exact: true })).toBeVisible();
    const detailUrl = page.url().split("?")[0];

    // Public page is live
    expect((await page.request.get(`/p/${slug}`)).status()).toBe(200);

    // Suspend
    await page.getByLabel("Status").selectOption("suspended");
    await page.getByRole("button", { name: "Salvar", exact: true }).first().click();
    await expect(page.getByText("Buffet atualizado.")).toBeVisible();
    expect((await page.request.get(`/p/${slug}`)).status()).toBe(404);
    expect((await page.request.get(`/p/${slug}/orcamento`)).status()).toBe(404);

    // Owner of the suspended buffet lands on /suspenso
    await logout(page);
    await login(page, { email: ownerEmail, password: "senha12345" }).catch(() => null);
    await page.goto("/home");
    await page.waitForURL(/\/suspenso/);
    await expect(page.getByText("Conta suspensa")).toBeVisible();

    // Reactivate as admin; owner now sees the onboarding checklist in their own org
    await logout(page);
    await login(page, ACCOUNTS.admin);
    await page.goto(detailUrl);
    await page.getByLabel("Status").selectOption("active");
    await page.getByRole("button", { name: "Salvar", exact: true }).first().click();
    await expect(page.getByText("Buffet atualizado.")).toBeVisible();
    await logout(page);
    await login(page, { email: ownerEmail, password: "senha12345" });
    await expect(page.getByText("Buffet E2E").first()).toBeVisible();
    await expect(page.getByText("Deixe seu buffet pronto para vender")).toBeVisible();
    await expect(page.getByText(`/p/${slug}?src=instagram`)).toBeVisible();

    // Owner cannot change slug/plan/status via API (DB trigger)
    await page.goto("/configuracoes/empresa");
    await expect(page.getByLabel("Endereço público")).toBeDisabled();
  });
});
