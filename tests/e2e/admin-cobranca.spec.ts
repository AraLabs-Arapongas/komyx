import { test, expect } from "@playwright/test";
import { ACCOUNTS, DEMO_SLUG, adminDb, brDate, login, logout, uniq } from "./helpers";

/**
 * Admin Cobrança: mensalidade, gerar fatura (vencida vira 'overdue'), marcar paga (ciclo avança),
 * cancelar; a dona vê as faturas em Minha conta, a equipe não. Invoices created here are deleted and
 * the buffet's billing row is restored in afterAll.
 */
test.describe.serial("Admin cobrança", () => {
  const marker = uniq("Fatura E2E");
  let orgId = "";
  let original: { cycle_start: string | null; due_at: string | null; status: string; monthly_price: number | null } | null = null;
  const day = (offset: number) => new Date(Date.now() + offset * 86_400_000 - 3 * 3_600_000).toISOString().slice(0, 10);

  test.beforeAll(async () => {
    const db = adminDb();
    const { data: org } = await db.from("organizations").select("id").eq("slug", DEMO_SLUG).single();
    orgId = org!.id;
    const { data } = await db.from("organization_billing").select("cycle_start, due_at, status, monthly_price").eq("organization_id", orgId).single();
    original = data;
  });

  test.afterAll(async () => {
    const db = adminDb();
    await db.from("billing_invoices").delete().eq("organization_id", orgId).like("notes", `${marker}%`);
    if (original) await db.from("organization_billing").update(original).eq("organization_id", orgId);
  });

  test("admin gera, recebe e cancela faturas", async ({ page }) => {
    const db = adminDb();
    await login(page, ACCOUNTS.admin);
    await page.goto("/admin/cobranca");
    await expect(page.getByText("Receita mensal estimada")).toBeVisible();
    const row = page.locator(`tr[data-org="${DEMO_SLUG}"]`);

    // Monthly price
    await row.getByLabel("Mensalidade").fill("199,00");
    await row.getByRole("button", { name: "Salvar" }).click();
    await expect(row.getByText("Salvo.")).toBeVisible();
    await expect.poll(async () => (await db.from("organization_billing").select("monthly_price").eq("organization_id", orgId).single()).data?.monthly_price).toBe(199);

    // Invoice due yesterday: shows as overdue and flips billing to 'overdue' on the next page load
    await row.locator("summary", { hasText: "Gerar fatura" }).click();
    await expect(row.getByLabel("Valor (R$)")).toHaveValue("199,00");
    await row.getByLabel("Vencimento").fill(day(-1));
    await row.getByLabel("Observação").fill(`${marker} vencida`);
    await row.getByRole("button", { name: "Gerar fatura" }).click();
    const inv1 = page.locator("tr[data-invoice]").filter({ hasText: `${marker} vencida` });
    await expect(inv1.getByText("Vencida", { exact: true })).toBeVisible();
    await page.reload();
    await expect.poll(async () => (await db.from("organization_billing").select("status").eq("organization_id", orgId).single()).data?.status).toBe("overdue");

    // Mark paid: billing back to 'ok' and the cycle moves to the invoice period
    const { data: created } = await db.from("billing_invoices").select("id, period_start, period_end").eq("organization_id", orgId).eq("notes", `${marker} vencida`).single();
    await inv1.locator("summary", { hasText: "Marcar paga" }).click();
    await inv1.getByLabel("Forma", { exact: true }).click();
    await page.getByRole("option", { name: "Boleto", exact: true }).click();
    await inv1.getByRole("button", { name: "Confirmar pagamento" }).click();
    await expect(page.locator("tr[data-invoice]").filter({ hasText: `${marker} vencida` }).getByText("Paga", { exact: true })).toBeVisible();
    await expect.poll(async () => (await db.from("organization_billing").select("status, cycle_start, due_at").eq("organization_id", orgId).single()).data).toEqual({ status: "ok", cycle_start: created!.period_start, due_at: created!.period_end });
    const { data: paid } = await db.from("billing_invoices").select("status, method").eq("id", created!.id).single();
    expect(paid).toEqual({ status: "paid", method: "boleto" });

    // Next invoice defaults to the following period; cancel it
    await row.locator("summary", { hasText: "Gerar fatura" }).click();
    await expect(row.getByLabel("Início do período")).toHaveValue(created!.period_end);
    await row.getByLabel("Observação").fill(`${marker} cancelar`);
    await row.getByRole("button", { name: "Gerar fatura" }).click();
    const inv2 = page.locator("tr[data-invoice]").filter({ hasText: `${marker} cancelar` });
    await expect(inv2.getByText("Em aberto", { exact: true })).toBeVisible();
    await inv2.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.locator("tr[data-invoice]").filter({ hasText: `${marker} cancelar` }).getByText("Cancelada", { exact: true })).toBeVisible();

    // Filter
    await page.getByLabel("Filtrar faturas").click();
    await page.getByRole("option", { name: "Pagas", exact: true }).click();
    await page.waitForURL(/status=paga/);
    await expect(page.locator("tr[data-invoice]").filter({ hasText: `${marker} cancelar` })).toHaveCount(0);
    await expect(page.locator("tr[data-invoice]").filter({ hasText: `${marker} vencida` })).toBeVisible();

    // Owner sees the paid invoice (not the cancelled one) in Minha conta
    await logout(page);
    await login(page, ACCOUNTS.owner);
    await page.goto("/conta");
    const faturas = page.locator("#faturas");
    // Manual billing or Asaas, depending on the env: either instruction is fine.
    await expect(faturas.getByText(/A Komyx envia os dados de pagamento pelo WhatsApp\.|Pague pelo link da fatura/)).toBeVisible();
    await expect(faturas.getByText(`${brDate(created!.period_start)} a ${brDate(created!.period_end)}`)).toBeVisible();
    await expect(faturas.getByText("Cancelada", { exact: true })).toHaveCount(0);

    // Staff does not
    await logout(page);
    await login(page, ACCOUNTS.staff);
    await page.goto("/conta");
    await expect(page.getByText("Minha conta").first()).toBeVisible();
    await expect(page.locator("#faturas")).toHaveCount(0);
  });
});
