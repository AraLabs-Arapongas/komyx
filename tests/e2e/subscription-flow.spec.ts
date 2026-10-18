import Module from "node:module";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { adminDb, uniq } from "./helpers";

/**
 * Komyx subscription flow (docs/assinatura.md) at the unit level, in this process: the billing modules run
 * against the local database with a stubbed Asaas (no sandbox charges). Covers trial → subscription →
 * plan change → late days 1/5/9 → pause on day 10 → payment → back, and every cancellation path including
 * the R$ 443 example. A throwaway buffet is created and deleted.
 */

// The billing modules import "server-only" (a Next alias) and "@/..." (tsconfig paths): resolve both here.
const M = Module as unknown as { _resolveFilename: (req: string, ...rest: unknown[]) => string };
const origResolve = M._resolveFilename;
const SRC = path.resolve(__dirname, "../../src");
M._resolveFilename = function (req: string, ...rest: unknown[]) {
  if (req === "server-only") return require.resolve("next/dist/compiled/server-only/empty.js");
  if (req.startsWith("@/")) return origResolve.call(this, path.join(SRC, req.slice(2)), ...rest);
  return origResolve.call(this, req, ...rest);
};

type Call = { method: string; path: string; body?: Record<string, unknown> };
const calls: Call[] = [];
const subId = uniq("sub_test");
let firstPayment: Record<string, unknown> | null = null;
const realFetch = globalThis.fetch;
// Fake Asaas: records every call; anything unexpected fails loudly instead of reaching the sandbox.
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (!url.includes("asaas.com")) return realFetch(input, init);
  const method = init?.method ?? "GET";
  const path = url.replace(/^https:\/\/[^/]+\/v3/, "");
  const body = init?.body ? JSON.parse(String(init.body)) : undefined;
  calls.push({ method, path, body });
  const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
  if (method === "POST" && path === "/customers") return json({ id: "cus_test" });
  if (method === "POST" && path.startsWith("/customers/")) return json({ id: "cus_test" });
  if (method === "POST" && path === "/subscriptions") return json({ id: subId });
  if (method === "GET" && path === `/subscriptions/${subId}/payments`) return json({ data: firstPayment ? [firstPayment] : [] });
  if (method === "POST" && path === `/subscriptions/${subId}`) return json({ id: subId });
  if (method === "DELETE" && path.startsWith("/subscriptions/")) return json({ deleted: true });
  if (method === "POST" && /^\/payments\/[^/]+\/refund$/.test(path)) return json({ id: path.split("/")[2], status: "REFUND_REQUESTED", value: body?.value });
  return json({ errors: [{ description: `unexpected ${method} ${path}` }] }, 404);
}) as typeof fetch;

const mods = async () => ({
  plans: await import("../../src/lib/billing/plans"),
  inv: await import("../../src/lib/billing/invoices"),
  sync: await import("../../src/lib/billing/asaas-sync"),
  sub: await import("../../src/lib/billing/subscription"),
  admin: (await import("../../src/lib/supabase/admin")).createAdminClient(),
});

const todayKey = () => new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10);

test.describe.serial("Assinatura Komyx (regras + Asaas simulado)", () => {
  const slug = uniq("assinatura-unit");
  const email = `${slug}@teste.test`;
  let orgId = "";

  test.beforeAll(async () => {
    const db = adminDb();
    const { data: org } = await db.from("organizations").insert({ name: "Buffet Assinatura Unit", slug }).select("id").single();
    orgId = org!.id;
    const { data: u } = await db.auth.admin.createUser({ email, password: "senha12345", email_confirm: true, app_metadata: { organization_id: orgId, role: "owner" } });
    const { data: p } = await db.from("profiles").select("organization_id").eq("id", u.user!.id).single();
    await db.from("profiles").update({ organization_id: orgId, role: "owner" }).eq("id", u.user!.id);
    if (p && p.organization_id !== orgId) await db.from("organizations").delete().eq("id", p.organization_id);
  });

  test.afterAll(async () => {
    const db = adminDb();
    const { data: members } = await db.from("profiles").select("id").eq("organization_id", orgId);
    for (const m of members ?? []) await db.auth.admin.deleteUser(m.id);
    await db.from("organizations").delete().eq("id", orgId);
    globalThis.fetch = realFetch;
  });

  test("regras: preços, meses usados, atraso e reembolso (exemplo R$ 443)", async () => {
    const { plans } = await mods();
    expect([1, 3, 6, 12].map((m) => plans.periodPrice(m))).toEqual([149, 402, 714, 1188]);
    expect(plans.periodPrice(1, 199)).toBe(199);
    expect(plans.monthsUsed("2026-10-07", "2026-10-07")).toBe(1);
    expect(plans.monthsUsed("2026-10-07", "2027-02-20")).toBe(5);
    expect(plans.monthsUsed("2026-10-07", "2027-03-07")).toBe(6);

    // 12 months paid on 07/10/2026, cancelled in the 5th month: 1.188 − 5 × 149 = 443, access until 07/03/2027.
    const year = { id: "i1", amount: 1188, paid_at: "2026-10-07", period_start: "2026-10-07", period_end: "2027-10-07", months: 12, provider: "asaas", external_id: "pay_1" };
    const r = plans.cancelOptions({ dueAt: "2027-10-07", lastPaid: year, today: "2027-02-20" });
    expect(r.monthIndex).toBe(5);
    expect(r.options).toEqual([
      { key: "keep", refund: 0, accessUntil: "2027-10-07", invoiceId: null },
      { key: "prorata", refund: 443, accessUntil: "2027-03-07", invoiceId: "i1" },
    ]);
    // Never negative: a 3-month plan in its 3rd month has nothing to give back.
    const quarter = { ...year, amount: 402, months: 3, period_end: "2027-01-07" };
    expect(plans.cancelOptions({ dueAt: "2027-01-07", lastPaid: quarter, today: "2026-12-20" }).options.map((o) => o.key)).toEqual(["keep"]);
    // Up to 7 days after a payment: all of it back, access ends now.
    const month = { ...year, amount: 149, months: 1, paid_at: "2026-10-05", period_start: "2026-10-05", period_end: "2026-11-05" };
    expect(plans.cancelOptions({ dueAt: "2026-11-05", lastPaid: month, today: "2026-10-12" }).options[1]).toEqual({ key: "full_7_days", refund: 149, accessUntil: "2026-10-11", invoiceId: "i1" });
    // Monthly after 7 days: only "use until the end".
    expect(plans.cancelOptions({ dueAt: "2026-11-05", lastPaid: month, today: "2026-10-13" }).options.map((o) => o.key)).toEqual(["keep"]);
    // Trial: nothing paid.
    expect(plans.cancelOptions({ dueAt: "2026-11-05", lastPaid: null, today: "2026-10-13" }).options).toEqual([{ key: "keep", refund: 0, accessUntil: "2026-11-05", invoiceId: null }]);

    // Late: earliest open invoice past due, or the end of a trial that never got a subscription.
    expect(plans.lateState({ status: "ok", due_at: "2026-10-01" }, [], "2026-10-18")).toBeNull();
    expect(plans.lateState({ status: "trial", due_at: "2026-10-08" }, [], "2026-10-18")).toMatchObject({ since: "2026-10-08", day: 10, payBy: "2026-10-17", pauseOn: "2026-10-18" });
    expect(plans.lateState({ status: "overdue", due_at: "2026-10-01" }, [{ id: "a", due_at: "2026-10-17", status: "open", payment_url: null, amount: 149 }], "2026-10-18")).toMatchObject({ since: "2026-10-17", day: 1 });
    expect([0, 1, 4, 5, 8, 9, 10, 15].map(plans.noticeDay)).toEqual([null, 1, 1, 5, 5, 9, 10, 10]);
    expect(plans.billingDataMissing({ document: "12.345.678/0001-90", whatsapp: null })).toEqual(["WhatsApp"]);
  });

  test("teste grátis: liga a cobrança sozinha quando CNPJ/CPF e WhatsApp ficam completos", async () => {
    const { sub, admin } = await mods();
    expect(await sub.maybeAutoEnable(admin, orgId)).toEqual({ enabled: false, reason: "missing data" });
    expect(calls).toHaveLength(0);
    const { data: bill } = await admin.from("organization_billing").select("due_at, status").eq("organization_id", orgId).single();
    expect(bill?.status).toBe("trial");
    firstPayment = { id: "pay_first", customer: "cus_test", subscription: subId, value: 149, dueDate: bill!.due_at, billingType: "UNDEFINED", status: "PENDING", invoiceUrl: "https://sandbox.asaas.com/i/pay_first" };

    await admin.from("organizations").update({ document: "12345678000190", whatsapp: "11987654321" }).eq("id", orgId);
    expect(await sub.maybeAutoEnable(admin, orgId)).toEqual({ enabled: true });
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual(["POST /customers", "POST /subscriptions", `GET /subscriptions/${subId}/payments`]);
    expect(calls[1].body).toMatchObject({ value: 149, cycle: "MONTHLY", nextDueDate: bill!.due_at, billingType: "UNDEFINED" });
    const { data: after } = await admin.from("organization_billing").select("provider_subscription_id, auto_billing").eq("organization_id", orgId).single();
    expect(after).toEqual({ provider_subscription_id: subId, auto_billing: true });
    const { data: inv } = await admin.from("billing_invoices").select("amount, due_at, months, status, payment_url").eq("organization_id", orgId).single();
    expect(inv).toMatchObject({ amount: 149, due_at: bill!.due_at, months: 1, status: "open", payment_url: "https://sandbox.asaas.com/i/pay_first" });
    // Already on: nothing more.
    expect((await sub.maybeAutoEnable(admin, orgId)).enabled).toBe(false);
    expect(calls).toHaveLength(3);
  });

  test("troca de plano no teste vale na hora (Asaas segue)", async () => {
    const { sub, sync, inv, admin } = await mods();
    calls.length = 0;
    const { data: bill } = await admin.from("organization_billing").select("due_at").eq("organization_id", orgId).single();
    expect(await sub.changePlan(admin, orgId, 12, null)).toEqual({ mode: "now", months: 12 });
    expect(calls).toEqual([{ method: "POST", path: `/subscriptions/${subId}`, body: expect.objectContaining({ value: 1188, cycle: "YEARLY", nextDueDate: bill!.due_at, updatePendingPayments: true }) }]);
    await sync.applyAsaasEvent(admin, "PAYMENT_UPDATED", ({ ...firstPayment!, value: 1188 }) as never);
    const { data: i } = await admin.from("billing_invoices").select("amount, months, period_end").eq("external_id", "pay_first").single();
    expect(i).toEqual({ amount: 1188, months: 12, period_end: inv.addMonths(bill!.due_at!, 12) });
    // Back to monthly for the rest of the flow.
    expect((await sub.changePlan(admin, orgId, 1, null)).mode).toBe("now");
    await sync.applyAsaasEvent(admin, "PAYMENT_UPDATED", firstPayment as never);
    const { data: b } = await admin.from("organization_billing").select("billing_period, pending_period").eq("organization_id", orgId).single();
    expect(b).toEqual({ billing_period: 1, pending_period: null });
  });

  test("atraso: avisos nos dias 1, 5 e 9 (sem repetir), pausa no dia 10, pagamento volta sozinho", async () => {
    const { sub, sync, plans, inv, admin } = await mods();
    const today = todayKey();
    const shift = async (days: number) => {
      const due = plans.addDays(today, -days);
      await admin.from("billing_invoices").update({ due_at: due, period_start: due, period_end: inv.addMonths(due, 1) }).eq("external_id", "pay_first");
      await admin.from("organization_billing").update({ due_at: due }).eq("organization_id", orgId);
      return due;
    };
    const notices = async () => (await admin.from("billing_notices").select("day, overdue_since, email_status").eq("organization_id", orgId).order("created_at")).data ?? [];
    const before = new Date().toISOString();

    const d1 = await shift(1);
    expect(await sub.runBillingDaily(admin, { orgIds: [orgId] })).toMatchObject({ checked: 1, notices: 1, paused: 0, errors: [] });
    expect((await sub.runBillingDaily(admin, { orgIds: [orgId] })).notices).toBe(0);
    expect(await notices()).toEqual([{ day: 1, overdue_since: d1, email_status: "sent" }]);

    const d5 = await shift(5);
    expect((await sub.runBillingDaily(admin, { orgIds: [orgId] })).notices).toBe(1);
    const d9 = await shift(9);
    expect((await sub.runBillingDaily(admin, { orgIds: [orgId] })).notices).toBe(1);
    expect((await sub.runBillingDaily(admin, { orgIds: [orgId] })).notices).toBe(0);
    const { data: notPaused } = await admin.from("organization_billing").select("paused_at").eq("organization_id", orgId).single();
    expect(notPaused?.paused_at).toBeNull();

    const d10 = await shift(10);
    expect(await sub.runBillingDaily(admin, { orgIds: [orgId] })).toMatchObject({ notices: 1, paused: 1 });
    const { data: paused } = await admin.from("organization_billing").select("paused_at").eq("organization_id", orgId).single();
    expect(paused?.paused_at).not.toBeNull();
    expect((await notices()).map((n) => [n.day, n.overdue_since])).toEqual([[1, d1], [5, d5], [9, d9], [10, d10]]);
    const { data: mails } = await admin.from("message_log").select("subject, to_address").eq("organization_id", orgId).eq("kind", "billing").gte("created_at", before).order("created_at");
    expect(mails?.map((m) => m.subject)).toEqual([
      "Sua mensalidade do Komyx venceu · Buffet Assinatura Unit",
      "Sua mensalidade do Komyx venceu · Buffet Assinatura Unit",
      "Amanhã seu acesso ao Komyx será pausado · Buffet Assinatura Unit",
      "Seu acesso ao Komyx está pausado · Buffet Assinatura Unit",
    ]);
    expect(new Set(mails?.map((m) => m.to_address))).toEqual(new Set([email]));

    // Webhook confirms the payment: invoice paid, cycle moves on, access back.
    expect(await sync.applyAsaasEvent(admin, "PAYMENT_RECEIVED", ({ ...firstPayment!, dueDate: d10, billingType: "PIX", paymentDate: today }) as never)).toBe("paga");
    const { data: back } = await admin.from("organization_billing").select("paused_at, status, cycle_start, due_at").eq("organization_id", orgId).single();
    expect(back).toMatchObject({ paused_at: null, status: "ok", cycle_start: d10 });
    const { data: audit } = await admin.from("admin_audit").select("action").eq("organization_id", orgId).in("action", ["billing.paused", "billing.unpaused"]).order("created_at");
    expect(audit?.map((a) => a.action)).toEqual(["billing.paused", "billing.unpaused"]);
    expect((await sub.runBillingDaily(admin, { orgIds: [orgId] })).notices).toBe(0);
  });

  test("troca depois de pago: agenda para a renovação, desfaz, e vira o plano quando a renovação é paga", async () => {
    const { sub, sync, inv, admin } = await mods();
    calls.length = 0;
    const { data: bill } = await admin.from("organization_billing").select("due_at").eq("organization_id", orgId).single();
    const renewal = bill!.due_at!;
    expect(await sub.changePlan(admin, orgId, 12, null)).toEqual({ mode: "scheduled", months: 12, from: renewal });
    expect(calls[0]).toEqual({ method: "POST", path: `/subscriptions/${subId}`, body: expect.objectContaining({ cycle: "YEARLY", value: 1188, nextDueDate: renewal }) });
    const next = { id: "pay_renewal", customer: "cus_test", subscription: subId, value: 1188, dueDate: renewal, billingType: "UNDEFINED", status: "PENDING", invoiceUrl: "https://sandbox.asaas.com/i/pay_renewal" };
    await sync.applyAsaasEvent(admin, "PAYMENT_CREATED", next);
    expect((await admin.from("billing_invoices").select("months, period_end").eq("external_id", "pay_renewal").single()).data).toEqual({ months: 12, period_end: inv.addMonths(renewal, 12) });

    // Desfazer: back to monthly on Asaas and on the pending charge.
    expect((await sub.changePlan(admin, orgId, 1, null)).mode).toBe("undone");
    expect(calls[1].body).toMatchObject({ cycle: "MONTHLY", value: 149, nextDueDate: renewal });
    await sync.applyAsaasEvent(admin, "PAYMENT_UPDATED", { ...next, value: 149 });
    expect((await admin.from("billing_invoices").select("months, amount").eq("external_id", "pay_renewal").single()).data).toEqual({ months: 1, amount: 149 });
    expect((await admin.from("organization_billing").select("pending_period").eq("organization_id", orgId).single()).data?.pending_period).toBeNull();

    // Schedule again and pay the renewal: 12 months become the plan in force.
    await sub.changePlan(admin, orgId, 12, null);
    await sync.applyAsaasEvent(admin, "PAYMENT_UPDATED", next);
    await sync.applyAsaasEvent(admin, "PAYMENT_CONFIRMED", { ...next, billingType: "CREDIT_CARD", paymentDate: todayKey() });
    expect((await admin.from("organization_billing").select("billing_period, pending_period, pending_from, due_at").eq("organization_id", orgId).single()).data).toEqual({ billing_period: 12, pending_period: null, pending_from: null, due_at: inv.addMonths(renewal, 12) });
  });

  /** Puts the buffet back to active with one paid invoice (and an Asaas subscription). */
  async function paidState(opts: { amount: number; months: number; start: string; paidAt: string; method: string; provider: "asaas" | "manual"; externalId: string | null }) {
    const { inv, admin } = await mods();
    await admin.from("billing_refunds").delete().eq("organization_id", orgId);
    await admin.from("billing_invoices").delete().eq("organization_id", orgId);
    await admin.from("organizations").update({ status: "active", cancelled_at: null, cancel_reason: null, access_until: null }).eq("id", orgId);
    const end = inv.addMonths(opts.start, opts.months);
    const { data } = await admin.from("billing_invoices").insert({ organization_id: orgId, period_start: opts.start, period_end: end, months: opts.months, amount: opts.amount, due_at: opts.start, status: "paid", paid_at: opts.paidAt, method: opts.method, provider: opts.provider, external_id: opts.externalId }).select("id").single();
    await admin.from("organization_billing").update({ status: "ok", cycle_start: opts.start, due_at: end, billing_period: opts.months, pending_period: null, pending_from: null, paused_at: null, provider_subscription_id: subId, auto_billing: true }).eq("organization_id", orgId);
    return { invoiceId: data!.id, end };
  }

  test("cancelamento 12 meses no 5º mês: devolve R$ 443 pelo Asaas, acesso até o fim do 5º mês", async () => {
    const { sub, sync, plans, inv, admin } = await mods();
    const today = todayKey();
    const start = plans.addDays(inv.addMonths(today, -4), -3);
    const { invoiceId } = await paidState({ amount: 1188, months: 12, start, paidAt: start, method: "pix", provider: "asaas", externalId: "pay_year" });
    calls.length = 0;
    const r = await sub.cancelWithOption(admin, orgId, "prorata", "Está caro", { id: (await admin.from("profiles").select("id").eq("email", email).single()).data!.id, email });
    expect(r).toEqual({ option: { key: "prorata", refund: 443, accessUntil: inv.addMonths(start, 5), invoiceId }, refundStatus: "requested" });
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([`DELETE /subscriptions/${subId}`, "POST /payments/pay_year/refund"]);
    expect(calls[1].body).toMatchObject({ value: 443 });
    expect((await admin.from("organizations").select("status, access_until, cancel_reason").eq("id", orgId).single()).data).toEqual({ status: "cancelled", access_until: inv.addMonths(start, 5), cancel_reason: "Está caro" });
    expect((await admin.from("organization_billing").select("provider_subscription_id, auto_billing, due_at").eq("organization_id", orgId).single()).data).toEqual({ provider_subscription_id: null, auto_billing: false, due_at: inv.addMonths(start, 5) });
    // Asaas confirms the refund through the webhook; the invoice stays paid.
    expect(await sync.applyAsaasEvent(admin, "PAYMENT_REFUNDED", { id: "pay_year", customer: "cus_test", value: 1188, dueDate: start, billingType: "PIX", status: "REFUNDED" })).toBe("reembolso confirmado");
    expect((await admin.from("billing_refunds").select("amount, status, method, reason").eq("organization_id", orgId).single()).data).toEqual({ amount: 443, status: "done", method: "asaas", reason: "prorata" });
    expect((await admin.from("billing_invoices").select("status").eq("id", invoiceId).single()).data?.status).toBe("paid");
    const { data: audit } = await admin.from("admin_audit").select("details, admin_email").eq("organization_id", orgId).eq("action", "subscription.cancel").single();
    expect(audit).toMatchObject({ admin_email: email, details: { option: "prorata", refund: 443, refund_status: "requested" } });
  });

  test("cancelamento até 7 dias: devolve tudo; pago por boleto vai para o Pix do admin", async () => {
    const { sub, plans, admin } = await mods();
    const today = todayKey();
    const paidAt = plans.addDays(today, -2);
    await paidState({ amount: 149, months: 1, start: paidAt, paidAt, method: "boleto", provider: "asaas", externalId: "pay_boleto" });
    calls.length = 0;
    const r = await sub.cancelWithOption(admin, orgId, "full_7_days", null, null);
    expect(r.option).toMatchObject({ key: "full_7_days", refund: 149, accessUntil: plans.addDays(today, -1) });
    expect(r.refundStatus).toBe("manual");
    expect(calls.map((c) => c.method + " " + c.path)).toEqual([`DELETE /subscriptions/${subId}`]);
    expect((await admin.from("billing_refunds").select("amount, status, error").eq("organization_id", orgId).single()).data).toEqual({ amount: 149, status: "manual", error: "Pago por boleto: reembolsar por Pix." });
  });

  test("mensal depois de 7 dias: sem reembolso, usa até o fim do mês pago", async () => {
    const { sub, plans, admin } = await mods();
    const today = todayKey();
    const start = plans.addDays(today, -20);
    const { end } = await paidState({ amount: 149, months: 1, start, paidAt: start, method: "pix", provider: "asaas", externalId: "pay_month" });
    await expect(sub.cancelWithOption(admin, orgId, "prorata", null, null)).rejects.toThrow(/não vale mais/);
    await expect(sub.cancelWithOption(admin, orgId, "full_7_days", null, null)).rejects.toThrow(/não vale mais/);
    const r = await sub.cancelWithOption(admin, orgId, "keep", null, null);
    expect(r).toEqual({ option: { key: "keep", refund: 0, accessUntil: end, invoiceId: null }, refundStatus: "none" });
    expect((await admin.from("billing_refunds").select("id").eq("organization_id", orgId)).data).toEqual([]);
    expect((await admin.from("organizations").select("access_until").eq("id", orgId).single()).data?.access_until).toBe(end);
  });

  test("rotina diária: rota exige o segredo interno", async ({ request }) => {
    const res = await request.post("/api/billing/asaas/daily", { headers: { authorization: "Bearer errado" } });
    expect(res.status()).toBe(401);
  });
});
