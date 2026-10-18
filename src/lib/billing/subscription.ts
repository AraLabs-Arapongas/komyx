import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/database.types";
import { appUrl, formatPhone, toDateKey } from "@/lib/utils";
import { SUPPORT_WHATSAPP } from "@/lib/billing";
import { renderTemplate } from "@/lib/email/templates";
import { sendLoggedEmail } from "@/lib/email/message-log";
import type { TemplateKey } from "@/lib/email/template-copy";
import { asaasConfigured, refundPayment } from "./asaas";
import { BillingSetupError, disableAutoBilling, enableAutoBilling, updateSubscriptionPlan } from "./asaas-sync";
import { refreshPause } from "./settle";
import { billingDataMissing, brDate, cancelOptions, lateState, noticeDay, PAUSE_DAY, type CancelOption, type PeriodMonths } from "./plans";

/** The subscription flow of docs/assinatura.md: auto-enable, plan change, late notices, pause, cancellation. */

type Admin = ReturnType<typeof createAdminClient>;
type Actor = { id: string; email?: string | null } | null;

/** Audit line (/admin/auditoria). Actor null = the system (daily job, webhook). Never throws. */
export async function logBilling(admin: Admin, actor: Actor, action: string, orgId: string, details: Record<string, unknown> = {}) {
  try {
    await admin.from("admin_audit").insert({ admin_id: actor?.id ?? null, admin_email: actor ? actor.email ?? null : "sistema", action, organization_id: orgId, details: details as Json });
  } catch (e) {
    console.error("[billing-audit]", action, e);
  }
}

/** Everything the owner screens and the admin need about one buffet's subscription. */
export async function subscriptionContext(admin: Admin, orgId: string) {
  const [{ data: org }, { data: bill }, { data: invoices }] = await Promise.all([
    admin.from("organizations").select("id, name, slug, kind, is_demo, status, document, whatsapp, access_until").eq("id", orgId).single(),
    admin.from("organization_billing").select("*").eq("organization_id", orgId).maybeSingle(),
    admin.from("billing_invoices").select("id, amount, status, due_at, paid_at, period_start, period_end, months, provider, external_id, payment_url, method").eq("organization_id", orgId).neq("status", "void").order("due_at", { ascending: false }).limit(50),
  ]);
  const today = toDateKey(new Date());
  const all = invoices ?? [];
  const open = all.filter((i) => i.status === "open");
  const paid = all.filter((i) => i.status === "paid").sort((a, b) => (b.paid_at ?? "").localeCompare(a.paid_at ?? "") || b.period_start.localeCompare(a.period_start));
  return { org, bill, today, open, paid, lastPaid: paid[0] ?? null, late: lateState(bill, open, today) };
}

/** Demo buffets and the platform org are never charged, paused or notified. */
const billable = (org: { kind: string; is_demo: boolean } | null) => Boolean(org && org.kind === "buffet" && !org.is_demo);

/**
 * Turns on the Asaas subscription by itself once the buffet has CNPJ/CPF + WhatsApp, while it has never
 * paid (trial, or trial ended waiting for the data). Called after saving Configurações › Empresa and by the
 * daily job. Skips when the admin turned auto billing off. Never throws.
 */
export async function maybeAutoEnable(admin: Admin, orgId: string): Promise<{ enabled: boolean; reason?: string }> {
  try {
    if (!asaasConfigured()) return { enabled: false, reason: "asaas off" };
    const [{ data: org }, { data: bill }] = await Promise.all([
      admin.from("organizations").select("kind, is_demo, status, document, whatsapp").eq("id", orgId).single(),
      admin.from("organization_billing").select("status, provider_subscription_id, auto_billing_disabled_at").eq("organization_id", orgId).maybeSingle(),
    ]);
    if (!billable(org) || org!.status !== "active") return { enabled: false, reason: "not billable" };
    if (!bill || bill.provider_subscription_id || bill.auto_billing_disabled_at || bill.status !== "trial") return { enabled: false, reason: "not needed" };
    if (billingDataMissing(org!).length) return { enabled: false, reason: "missing data" };
    const r = await enableAutoBilling(admin, orgId);
    await logBilling(admin, null, "billing.auto_on", orgId, { ...r, source: "dados completos" });
    return { enabled: true };
  } catch (e) {
    console.error("[billing] auto enable", orgId, e);
    return { enabled: false, reason: e instanceof Error ? e.message : String(e) };
  }
}

export type PlanChange = { mode: "now" | "scheduled" | "undone" | "same"; months: PeriodMonths; from?: string | null };

/**
 * Plan change. Before the first payment (trial) it applies at once. After that it is scheduled for the
 * next renewal (pending_period from due_at): what was paid runs to the end, no refund nor difference.
 * Choosing the plan in force again undoes the scheduled change. The Asaas subscription follows.
 */
export async function changePlan(admin: Admin, orgId: string, months: PeriodMonths, actor: Actor): Promise<PlanChange> {
  const { bill, paid, open, today } = await subscriptionContext(admin, orgId);
  if (!bill) throw new BillingSetupError("Este buffet não tem cobrança configurada.");
  const now = new Date().toISOString();
  if (!paid.length) {
    if (bill.billing_period === months && !bill.pending_period) return { mode: "same", months };
    const firstDue = open.map((i) => i.due_at).sort()[0] ?? bill.due_at ?? today;
    await updateSubscriptionPlan(admin, orgId, months, firstDue > today ? firstDue : today);
    await admin.from("organization_billing").update({ billing_period: months, pending_period: null, pending_from: null, updated_at: now }).eq("organization_id", orgId);
    await logBilling(admin, actor, "subscription.plan", orgId, { from: bill.billing_period, to: months, when: "agora (teste)" });
    return { mode: "now", months };
  }
  const from = bill.due_at && bill.due_at > today ? bill.due_at : today;
  if (bill.billing_period === months) {
    if (!bill.pending_period) return { mode: "same", months };
    await updateSubscriptionPlan(admin, orgId, months, from);
    await admin.from("organization_billing").update({ pending_period: null, pending_from: null, updated_at: now }).eq("organization_id", orgId);
    await logBilling(admin, actor, "subscription.plan_undo", orgId, { kept: months, dropped: bill.pending_period });
    return { mode: "undone", months };
  }
  await updateSubscriptionPlan(admin, orgId, months, from);
  await admin.from("organization_billing").update({ pending_period: months, pending_from: from, updated_at: now }).eq("organization_id", orgId);
  await logBilling(admin, actor, "subscription.plan", orgId, { from: bill.billing_period, to: months, starts: from });
  return { mode: "scheduled", months, from };
}

export type CancelResult = { option: CancelOption; refundStatus: "none" | "requested" | "manual" | "done" };

/**
 * Cancels with one of the choices of cancelOptions(): turns the Asaas subscription off first (if that fails
 * nothing changes), records access_until, and refunds through Asaas when it can; otherwise the refund waits
 * in /admin/cobranca for a Pix by hand. Everything goes to the audit.
 */
export async function cancelWithOption(admin: Admin, orgId: string, key: CancelOption["key"], reason: string | null, actor: Actor): Promise<CancelResult> {
  const ctx = await subscriptionContext(admin, orgId);
  const { options } = cancelOptions({ dueAt: ctx.bill?.due_at ?? null, lastPaid: ctx.lastPaid, today: ctx.today });
  const option = options.find((o) => o.key === key);
  if (!option) throw new BillingSetupError("Esta opção de cancelamento não vale mais. Recarregue a página.");
  await disableAutoBilling(admin, orgId);

  const now = new Date().toISOString();
  const { error } = await admin.from("organizations").update({ status: "cancelled", cancelled_at: now, cancel_reason: reason, access_until: option.accessUntil }).eq("id", orgId);
  if (error) throw new Error(error.message);
  await admin.from("organization_billing").update({
    pending_period: null, pending_from: null, paused_at: null,
    // A refund shortens what is paid: the cycle ends with the access.
    ...(option.refund > 0 ? { due_at: option.accessUntil } : {}),
    updated_at: now,
  }).eq("organization_id", orgId);

  let refundStatus: CancelResult["refundStatus"] = "none";
  let refundError: string | null = null;
  if (option.refund > 0) {
    const inv = ctx.paid.find((i) => i.id === option.invoiceId) ?? null;
    let status: "requested" | "manual" | "done" = "manual";
    let method: "asaas" | null = null;
    // Asaas cannot send a boleto payment back without bank data: those go to the admin's Pix.
    if (inv?.provider === "asaas" && inv.external_id && inv.method !== "boleto" && asaasConfigured()) {
      try {
        const r = await refundPayment(inv.external_id, option.refund, option.key === "full_7_days" ? "Komyx · reembolso integral (até 7 dias)" : "Komyx · reembolso proporcional do plano");
        status = r.status === "REFUNDED" ? "done" : "requested";
        method = "asaas";
      } catch (e) {
        refundError = e instanceof Error ? e.message : String(e);
      }
    } else if (inv?.method === "boleto") {
      refundError = "Pago por boleto: reembolsar por Pix.";
    }
    await admin.from("billing_refunds").insert({
      organization_id: orgId, invoice_id: option.invoiceId, amount: option.refund, reason: option.key === "full_7_days" ? "full_7_days" : "prorata",
      status, method, error: refundError, done_at: status === "done" ? now : null,
      details: { access_until: option.accessUntil, paid: inv?.amount ?? null, period_start: inv?.period_start ?? null, months: inv?.months ?? null } as Json,
    });
    refundStatus = status;
  }
  await logBilling(admin, actor, "subscription.cancel", orgId, { option: option.key, refund: option.refund, access_until: option.accessUntil, refund_status: refundStatus, refund_error: refundError, reason });
  return { option, refundStatus };
}

const NOTICE_TEMPLATE: Record<1 | 5 | 9 | 10, TemplateKey> = { 1: "billing_overdue", 5: "billing_overdue", 9: "billing_last_warning", 10: "billing_paused" };

/** The late notice e-mail to the buffet's owners. Returns the outcome for billing_notices. */
async function sendNotice(admin: Admin, orgId: string, buffet: string, day: 1 | 5 | 9 | 10, late: NonNullable<ReturnType<typeof lateState>>) {
  const { data: owners } = await admin.from("profiles").select("email").eq("organization_id", orgId).eq("role", "owner");
  const to = [...new Set((owners ?? []).map((o) => o.email).filter(Boolean))];
  if (!to.length) return "skipped" as const;
  const link = day === 10 ? appUrl("/pausado") : late.invoice?.payment_url ?? appUrl("/conta#assinatura");
  const { subject, html, text } = await renderTemplate(NOTICE_TEMPLATE[day], { buffet, link, vencimento: brDate(late.since), prazo: brDate(late.payBy), whatsapp: formatPhone(SUPPORT_WHATSAPP) });
  const results = await Promise.all(to.map((email) => sendLoggedEmail({ to: email, subject, html, text }, { kind: "billing", organizationId: orgId })));
  return results.every((r) => r.ok) ? ("sent" as const) : ("failed" as const);
}

export type DailySummary = { checked: number; autoEnabled: number; notices: number; paused: number; unpaused: number; errors: string[] };

/**
 * The daily billing job (pg_cron → /api/billing/asaas/daily): safety-net auto billing, late notices on days
 * 1/5/9 (once each: billing_notices), pause on day 10, unpause when no longer late. `orgIds` limits the run
 * (tests). Each buffet is independent: an error is reported and the run goes on.
 */
export async function runBillingDaily(admin: Admin, opts: { orgIds?: string[] } = {}): Promise<DailySummary> {
  const sum: DailySummary = { checked: 0, autoEnabled: 0, notices: 0, paused: 0, unpaused: 0, errors: [] };
  let q = admin.from("organizations").select("id, name").eq("kind", "buffet").eq("is_demo", false).eq("status", "active");
  if (opts.orgIds) q = q.in("id", opts.orgIds);
  const { data: orgs } = await q;
  for (const org of orgs ?? []) {
    sum.checked++;
    try {
      if ((await maybeAutoEnable(admin, org.id)).enabled) sum.autoEnabled++;
      const { bill, late } = await subscriptionContext(admin, org.id);
      if (!bill) continue;
      if (bill.paused_at && (!late || late.day < PAUSE_DAY)) {
        if (await refreshPause(admin, org.id)) sum.unpaused++;
        continue;
      }
      if (!late) continue;
      const day = noticeDay(late.day);
      if (day === 10 && !bill.paused_at) {
        await admin.from("organization_billing").update({ paused_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("organization_id", org.id).is("paused_at", null);
        await logBilling(admin, null, "billing.paused", org.id, { overdue_since: late.since, day: late.day });
        sum.paused++;
      }
      if (!day) continue;
      // Claim the notice first: a second run (or a retry) finds the row and sends nothing.
      const { data: claimed } = await admin.from("billing_notices").upsert({ organization_id: org.id, overdue_since: late.since, day }, { onConflict: "organization_id,overdue_since,day", ignoreDuplicates: true }).select("day");
      if (!claimed?.length) continue;
      const status = await sendNotice(admin, org.id, org.name, day, late);
      await admin.from("billing_notices").update({ email_status: status }).eq("organization_id", org.id).eq("overdue_since", late.since).eq("day", day);
      sum.notices++;
    } catch (e) {
      sum.errors.push(`${org.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return sum;
}
