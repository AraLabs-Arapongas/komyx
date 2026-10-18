import { test, expect } from "@playwright/test";
import { ACCOUNTS, DEMO_SLUG, adminDb, cleanupOrgBySlug, login, pickOption, uniq } from "./helpers";

/**
 * Admin: buffet por dentro (uso, última atividade, e-mail de senha), "Ver como" somente leitura e a
 * trilha de auditoria. Creates its own buffet (deleted in afterAll; audit rows stay with buffet = null).
 */
test.describe("Admin · buffet por dentro e auditoria", () => {
  const slug = uniq("e2e-dentro");
  const ownerEmail = `${slug}@e2e.test`;

  test.afterAll(async () => {
    await cleanupOrgBySlug(slug);
  });

  test("detalhe, ver como e auditoria", async ({ page }) => {
    await login(page, ACCOUNTS.admin);

    // Create the buffet (audited as org.create)
    await page.goto("/admin/buffets/novo");
    await page.getByLabel("Nome do buffet").fill("Buffet Dentro E2E");
    await page.getByLabel("Slug (opcional)").fill(slug);
    await pickOption(page, "Plano", "Premium");
    await page.getByLabel("Nome", { exact: true }).fill("Dona Dentro");
    await page.getByLabel("E-mail").fill(ownerEmail);
    await page.getByRole("button", { name: "Criar buffet e acesso" }).click();
    await page.waitForURL(/\/admin\/buffets\/[0-9a-f-]+\?created=1/);
    const orgId = page.url().split("/admin/buffets/")[1].split("?")[0];

    // Usage numbers and activity: a brand-new buffet counts from its sign-up, so it is not "parado" yet
    await expect(page.getByText("Última atividade", { exact: true })).toBeVisible();
    await expect(page.getByText("Pedidos (30 dias)")).toBeVisible();
    await expect(page.getByText("Festas fechadas")).toBeVisible();
    await expect(page.getByText(/parado · mais de 14 dias/)).toHaveCount(0);
    await expect(page.getByText(/último acesso nunca/)).toBeVisible();

    // Plan change is audited with before/after
    await pickOption(page, "Plano", "Básico");
    await page.getByRole("button", { name: "Salvar", exact: true }).first().click();
    await expect(page.getByText("Buffet atualizado.")).toBeVisible();

    // Password e-mail (provider is "log" locally)
    await page.getByRole("button", { name: "Reenviar e-mail de senha" }).click();
    // The welcome e-mail just generated a link, and Supabase allows one per minute per person.
    await expect(page.getByText(new RegExp(`E-mail de senha enviado para ${ownerEmail.replace(/[.+]/g, "\\$&")}\\.|Muitos pedidos seguidos`))).toBeVisible();

    // Ver como: read-only, no forms
    await page.getByRole("link", { name: "Ver como este buffet" }).first().click();
    await page.waitForURL(`**/admin/buffets/${orgId}/ver`);
    await expect(page.getByText("Visualização do admin · somente leitura.")).toBeVisible();
    await expect(page.getByText("Próximas festas")).toBeVisible();
    await expect(page.getByText("Dona Dentro")).toBeVisible();
    await expect(page.getByRole("button", { name: /Salvar|Reenviar|Redefinir|Tornar/ })).toHaveCount(0);
    await expect(page.locator("form:not([action='/auth/signout'])")).toHaveCount(0);

    // Audit trail filtered by this buffet
    await page.goto(`/admin/auditoria?org=${orgId}`);
    const table = page.locator("table");
    await expect(table.getByText("Criou buffet")).toBeVisible();
    await expect(table.getByText("Mudou o plano")).toBeVisible();
    await expect(table.getByText("plano: premium → basic")).toBeVisible();
    await expect(table.getByText("Viu como o buffet")).toBeVisible();

    // Filter by action through the SelectMenu
    await pickOption(page, "Ação", "Mudou o plano");
    await page.getByRole("button", { name: "Filtrar" }).click();
    await page.waitForURL(/action=org\.plan/);
    await expect(table.locator("tbody tr")).toHaveCount(1);

    const db = adminDb();
    const { data: rows } = await db.from("admin_audit").select("action, admin_email").eq("organization_id", orgId);
    expect(rows?.every((r) => r.admin_email === ACCOUNTS.admin.email)).toBe(true);

    // List: search by slug shows the buffet with its activity column
    await page.goto(`/admin/buffets?q=${slug}`);
    await expect(page.getByRole("columnheader", { name: "Última atividade" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Buffet Dentro E2E" })).toBeVisible();
  });

  test("ver como e detalhe de um buffet com dados", async ({ page }) => {
    const { data: org } = await adminDb().from("organizations").select("id").eq("slug", DEMO_SLUG).single();
    await login(page, ACCOUNTS.admin);
    await page.goto(`/admin/buffets/${org!.id}`);
    await expect(page.getByText("Última atividade", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reenviar e-mail de senha" }).first()).toBeVisible();
    await page.goto(`/admin/buffets/${org!.id}/ver`);
    await expect(page.getByText("Visualização do admin · somente leitura.")).toBeVisible();
    for (const title of ["Pendências", "Próximas festas", "Reservas aguardando confirmação", "Pedidos novos", "Orçamentos recentes", "Pacotes", "Equipe", "Página pública"]) {
      await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    }
    await expect(page.getByText("dona@festabuffet.test")).toBeVisible();
  });
});
