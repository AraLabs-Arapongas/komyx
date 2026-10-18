import { test, expect } from "@playwright/test";
import { ACCOUNTS, adminDb, brDate, login, logout, pickFreeDate, uniq } from "./helpers";

/**
 * Komyx subscription in the browser (docs/assinatura.md): trial banner, "Seu plano" (choose in the trial,
 * schedule after a payment, Desfazer), late banners on days 1 and 9, the paused screen (masked requests,
 * upcoming party, pay link) with online reservation paused on the public page, the real Asaas webhook
 * route bringing access back, cancellation with the R$ 443 refund and the admin's "Reembolsar por Pix".
 * Uses a throwaway buffet with no Asaas customer/subscription and manual/fake invoices, so nothing reaches
 * the Asaas sandbox.
 */

const day = (offset: number) => new Date(Date.now() + offset * 86_400_000 - 3 * 3_600_000).toISOString().slice(0, 10);
function addMonths(date: string, months: number) {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  t.setUTCDate(Math.min(d, last));
  return t.toISOString().slice(0, 10);
}
const shortDay = (iso: string) => brDate(iso);

test.describe.serial("Assinatura no app", () => {
  const slug = uniq("assinatura-e2e");
  const owner = { email: `${slug}@teste.test`, password: "senha12345" };
  let orgId = "";

  test.beforeAll(async () => {
    const db = adminDb();
    const { data: org } = await db.from("organizations").insert({ name: "Buffet Assinatura E2E", slug, pix_key: "11222333000181", city: "Arapongas" }).select("id").single();
    orgId = org!.id;
    const { data: u } = await db.auth.admin.createUser({ email: owner.email, password: owner.password, email_confirm: true, user_metadata: { name: "Dona Teste" }, app_metadata: { organization_id: orgId, role: "owner" } });
    const { data: p } = await db.from("profiles").select("organization_id").eq("id", u.user!.id).single();
    await db.from("profiles").update({ organization_id: orgId, role: "owner" }).eq("id", u.user!.id);
    if (p && p.organization_id !== orgId) await db.from("organizations").delete().eq("id", p.organization_id);
  });

  test.afterAll(async () => {
    const db = adminDb();
    const { data: members } = await db.from("profiles").select("id").eq("organization_id", orgId);
    for (const m of members ?? []) await db.auth.admin.deleteUser(m.id);
    await db.from("organizations").delete().eq("id", orgId);
  });

  test("teste grátis: banner pede os dados; plano escolhido vale na hora", async ({ page }) => {
    await login(page, owner);
    const banner = page.getByTestId("billing-banner");
    await expect(banner).toContainText("Complete CNPJ/CPF e WhatsApp do buffet para continuar usando depois do teste");
    await expect(banner.getByRole("link", { name: "Completar dados" })).toHaveAttribute("href", "/configuracoes/empresa");

    await page.goto("/conta");
    const card = page.getByTestId("plan-card");
    await card.getByText("Trocar de plano").click();
    for (const [m, v] of [["1", "R$ 149,00"], ["3", "R$ 402,00"], ["6", "R$ 714,00"], ["12", "R$ 1.188,00"]]) await expect(card.locator(`[data-plan="${m}"]`)).toContainText(v);
    await expect(card.locator('[data-plan="1"]')).toContainText("Seu plano");
    await expect(card.getByText(/Teste grátis até/)).toBeVisible();
    await card.locator('[data-plan="12"]').getByRole("button", { name: "Escolher" }).click();
    await expect(card.getByText("Plano 12 meses escolhido.")).toBeVisible();
    await expect(card.locator('[data-plan="12"]')).toContainText("Seu plano");
    expect((await adminDb().from("organization_billing").select("billing_period, pending_period").eq("organization_id", orgId).single()).data).toEqual({ billing_period: 12, pending_period: null });
  });

  test("depois de pago: troca agendada para a renovação, com Desfazer", async ({ page }) => {
    const db = adminDb();
    const start = day(-3);
    const end = addMonths(start, 1);
    await db.from("billing_invoices").insert({ organization_id: orgId, period_start: start, period_end: end, months: 1, amount: 149, due_at: start, status: "paid", paid_at: day(-10), method: "pix", notes: "E2E assinatura" });
    await db.from("organization_billing").update({ status: "ok", cycle_start: start, due_at: end, billing_period: 1 }).eq("organization_id", orgId);
    await db.from("organizations").update({ document: "11222333000181", whatsapp: "11987654321" }).eq("id", orgId);

    await login(page, owner);
    await expect(page.getByTestId("billing-banner")).toHaveCount(0);
    await page.goto("/conta");
    const card = page.getByTestId("plan-card");
    await card.getByText("Trocar de plano").click();
    await card.locator('[data-plan="3"]').getByRole("button", { name: "Trocar na renovação" }).click();
    await expect(card.getByTestId("pending-plan")).toContainText(`A partir de ${shortDay(end)}: plano 3 meses`);
    await expect(card.locator('[data-plan="1"]')).toContainText("Seu plano");
    await expect(card.locator('[data-plan="3"]')).toContainText("Agendado");
    expect((await db.from("organization_billing").select("pending_period, pending_from").eq("organization_id", orgId).single()).data).toEqual({ pending_period: 3, pending_from: end });

    await card.getByRole("button", { name: "Desfazer" }).click();
    await expect(card.getByText("Troca desfeita. Você continua no plano Mensal.")).toBeVisible();
    await expect(card.getByTestId("pending-plan")).toHaveCount(0);
    expect((await db.from("organization_billing").select("pending_period").eq("organization_id", orgId).single()).data?.pending_period).toBeNull();
  });

  test("atraso: faixa amarela no dia 1, vermelha no dia 9", async ({ page }) => {
    const db = adminDb();
    const { data: inv } = await db.from("billing_invoices").insert({ organization_id: orgId, period_start: day(-1), period_end: addMonths(day(-1), 1), months: 1, amount: 149, due_at: day(-1), status: "open", provider: "asaas", external_id: uniq("pay_e2e"), payment_url: "https://sandbox.asaas.com/i/e2e", notes: "E2E atraso" }).select("id, external_id").single();
    await login(page, owner);
    const banner = page.getByTestId("billing-banner");
    await expect(banner).toHaveAttribute("data-tone", "yellow");
    await expect(banner).toContainText(`Sua mensalidade venceu em ${brDate(day(-1))}. Pague até ${brDate(day(8))} para não pausar o acesso.`);
    await expect(banner).toContainText("Precisa de ajuda? Fale com a gente pelo WhatsApp ou contato@komyx.com.br");
    await expect(banner.getByRole("link", { name: "Pagar agora" })).toHaveAttribute("href", "https://sandbox.asaas.com/i/e2e");

    await db.from("billing_invoices").update({ due_at: day(-9), period_start: day(-9) }).eq("id", inv!.id);
    await page.reload();
    await expect(banner).toHaveAttribute("data-tone", "red");
    await expect(banner).toContainText("Amanhã seu acesso será pausado.");
  });

  test("dia 10: tela de acesso pausado, reserva online pausada, webhook do Asaas libera", async ({ page }) => {
    const db = adminDb();
    const { data: inv } = await db.from("billing_invoices").select("id, external_id").eq("organization_id", orgId).eq("notes", "E2E atraso").single();
    await db.from("billing_invoices").update({ due_at: day(-10), period_start: day(-10), period_end: addMonths(day(-10), 1) }).eq("id", inv!.id);
    await db.from("organization_billing").update({ paused_at: new Date().toISOString() }).eq("organization_id", orgId);
    // A request waiting for an answer and a confirmed party.
    await db.from("public_requests").insert({ organization_id: orgId, name: "Ana Souza", whatsapp: "11911112222", desired_date: day(60), participants: 80, estimated_total: 3500 });
    const { data: cust } = await db.from("customers").insert({ organization_id: orgId, name: "Carla Lima", whatsapp: "11933334444" }).select("id").single();
    const startsAt = new Date(Date.now() + 20 * 86_400_000);
    startsAt.setUTCHours(18, 0, 0, 0);
    await db.from("events").insert({ organization_id: orgId, customer_id: cust!.id, title: "Aniversário da Nina", starts_at: startsAt.toISOString(), ends_at: new Date(startsAt.getTime() + 4 * 3_600_000).toISOString(), status: "CONFIRMED", adults: 50, children: 20 });

    await page.goto("/login");
    await page.getByLabel("E-mail").fill(owner.email);
    await page.getByLabel("Senha", { exact: true }).fill(owner.password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL(/\/pausado/, { timeout: 60_000 });
    await expect(page.getByRole("heading", { name: "Seu acesso está pausado" })).toBeVisible();
    await expect(page.getByTestId("paused-requests")).toContainText("Ana S•••");
    await expect(page.getByTestId("paused-requests")).not.toContainText("Souza");
    await expect(page.getByTestId("paused-requests")).toContainText("R$ 3.500,00");
    await expect(page.getByTestId("paused-events")).toContainText("Aniversário da Nina");
    await expect(page.getByTestId("paused-events")).toContainText("70 convidados");
    await expect(page.getByTestId("paused-payment").getByRole("link", { name: /Pagar agora/ })).toHaveAttribute("href", "https://sandbox.asaas.com/i/e2e");
    await page.goto("/conta");
    await page.waitForURL(/\/pausado/);

    // Public page still up; a reservation lands as a plain request (no event, no Pix).
    const { data: pkg } = await db.from("packages").insert({ organization_id: orgId, name: "Pacote Teste", base_price: 2000, included_adults: 50, included_children: 20 }).select("id").single();
    expect(pkg).toBeTruthy();
    const date = await pickFreeDate(slug, 40);
    const res = await page.request.get(`/p/${slug}`);
    expect(res.status()).toBe(200);
    await page.goto(`/p/${slug}/orcamento`);
    await page.getByRole("button", { name: /Pacote Teste/ }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    const [y, m] = date.split("-").map(Number);
    const months = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    for (let i = 0; i < 4; i++) {
      if ((await page.getByText(`${months[m - 1]} de ${y}`, { exact: true }).count()) > 0) break;
      await page.getByRole("button", { name: "Próximo mês" }).click();
    }
    await page.getByRole("button", { name: brDate(date), exact: true }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByLabel("Seu nome", { exact: true }).fill("Bruno Reserva");
    await page.getByLabel("WhatsApp", { exact: true }).fill("11955556666");
    await page.getByLabel("Aniversariante", { exact: true }).fill("Leo");
    await page.getByLabel("Nascimento", { exact: true }).fill("2020-05-05");
    await page.getByRole("button", { name: "Continuar" }).click();
    // Paused: the wizard no longer offers online booking, only the plain request.
    await expect(page.getByRole("button", { name: "Reservar esta data" })).toHaveCount(0);
    await page.getByRole("button", { name: "Enviar pedido" }).click();
    await expect(page.getByText(/Recebemos seu orçamento/)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Data reservada")).toHaveCount(0);
    const { data: lead } = await db.from("public_requests").select("id, event_id").eq("organization_id", orgId).eq("whatsapp", "11955556666").single();
    expect(lead?.event_id).toBeNull();
    expect((await db.from("events").select("id").eq("organization_id", orgId).eq("customer_id", cust!.id)).data).toHaveLength(1);

    // The Asaas webhook confirms the payment: access comes back by itself.
    const hook = await page.request.post("/api/billing/asaas", {
      headers: { "asaas-access-token": process.env.ASAAS_WEBHOOK_TOKEN ?? "" },
      data: { id: uniq("evt"), event: "PAYMENT_RECEIVED", payment: { id: inv!.external_id, customer: "cus_x", value: 149, dueDate: day(-10), billingType: "PIX", status: "RECEIVED", paymentDate: day(0) } },
    });
    expect(hook.status(), "set ASAAS_WEBHOOK_TOKEN in .env.local").toBe(200);
    expect((await hook.json()).result).toBe("paga");
    expect((await db.from("organization_billing").select("paused_at").eq("organization_id", orgId).single()).data?.paused_at).toBeNull();
    await page.goto("/home");
    await expect(page).toHaveURL(/\/home/);
    await expect(page.getByTestId("billing-banner")).toHaveCount(0);
  });

  test("cancelamento no 5º mês do plano de 12: devolve R$ 443; admin paga por Pix", async ({ page }) => {
    const db = adminDb();
    await db.from("billing_invoices").delete().eq("organization_id", orgId);
    const start = addMonths(day(-3), -4);
    const end = addMonths(start, 12);
    await db.from("billing_invoices").insert({ organization_id: orgId, period_start: start, period_end: end, months: 12, amount: 1188, due_at: start, status: "paid", paid_at: start, method: "pix", notes: "E2E anual" });
    await db.from("organization_billing").update({ status: "ok", cycle_start: start, due_at: end, billing_period: 12, pending_period: null, pending_from: null }).eq("organization_id", orgId);

    await login(page, owner);
    await page.goto("/conta");
    await page.getByRole("button", { name: "Cancelar assinatura" }).click();
    const dialog = page.getByRole("dialog", { name: "Cancelar assinatura" });
    await expect(dialog.getByTestId("cancel-summary")).toHaveText(`Você está no 5º mês. Se cancelar agora, devolvemos R$ 443,00 e você usa o Komyx até ${brDate(addMonths(start, 5))}. Ou continue até ${brDate(end)} sem reembolso.`);
    await expect(dialog.getByLabel(/Receber R\$\s443,00 de volta/)).toBeChecked();
    await dialog.getByLabel("Digite CANCELAR para confirmar").fill("CANCELAR");
    await dialog.getByRole("button", { name: "Cancelar assinatura" }).click();
    // The page re-renders as cancelled, with the refund on its way.
    await expect(page.getByText(/Assinatura cancelada em/)).toBeVisible();
    await expect(page.getByText(/Reembolso de R\$\s443,00: a Komyx envia por Pix/)).toBeVisible();
    const { data: refund } = await db.from("billing_refunds").select("id, amount, status, reason").eq("organization_id", orgId).single();
    expect(refund).toMatchObject({ amount: 443, status: "manual", reason: "prorata" });
    expect((await db.from("organizations").select("status, access_until").eq("id", orgId).single()).data).toEqual({ status: "cancelled", access_until: addMonths(start, 5) });

    await logout(page);
    await login(page, ACCOUNTS.admin);
    await page.goto("/admin/cobranca");
    const row = page.locator(`tr[data-refund="${refund!.id}"]`);
    await expect(row).toContainText("Buffet Assinatura E2E");
    await expect(row).toContainText("Pagar por Pix");
    page.once("dialog", (d) => d.accept());
    await row.getByRole("button", { name: /Reembolsar R\$\s443,00 por Pix/ }).click();
    await expect(page.locator(`tr[data-refund="${refund!.id}"]`)).toContainText("Feito");
    expect((await db.from("billing_refunds").select("status, method").eq("id", refund!.id).single()).data).toEqual({ status: "done", method: "pix" });
    const { data: audit } = await db.from("admin_audit").select("action").eq("organization_id", orgId).in("action", ["subscription.cancel", "refund.pix"]).order("created_at");
    expect(audit?.map((a) => a.action)).toEqual(["subscription.cancel", "refund.pix"]);
  });
});
