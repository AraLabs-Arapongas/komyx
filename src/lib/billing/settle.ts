import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import { toDateKey } from "@/lib/utils";

/** Settling Komyx invoices, shared by the admin buttons (/admin/cobranca) and the Asaas webhook. */

type Admin = ReturnType<typeof createAdminClient>;

export async function hasOverdueInvoices(admin: Admin, orgId: string) {
  const { count } = await admin.from("billing_invoices").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "open").lt("due_at", toDateKey(new Date()));
  return (count ?? 0) > 0;
}

/**
 * Marks an open invoice paid. Returns null when it was not open (a repeat click or a repeated webhook).
 * Rule: a paid invoice pays its period. The buffet's cycle becomes period_start → period_end (due_at is
 * the next charge) and billing goes back to 'ok'. The cycle only moves forward (paying an old invoice
 * never pulls due_at back), and billing stays 'overdue' while another open invoice is past due.
 */
export async function settleInvoicePaid(admin: Admin, id: string, paidAt: string, method: string) {
  const { data: inv } = await admin.from("billing_invoices").update({ status: "paid", paid_at: paidAt, method }).eq("id", id).eq("status", "open").select("organization_id, period_start, period_end, amount").maybeSingle();
  if (!inv) return null;
  const { data: bill } = await admin.from("organization_billing").select("due_at").eq("organization_id", inv.organization_id).maybeSingle();
  const forward = !bill?.due_at || inv.period_end >= bill.due_at;
  const status = (await hasOverdueInvoices(admin, inv.organization_id)) ? "overdue" : "ok";
  await admin.from("organization_billing").upsert({
    organization_id: inv.organization_id,
    status,
    ...(forward ? { cycle_start: inv.period_start, due_at: inv.period_end } : {}),
    updated_at: new Date().toISOString(),
  });
  return inv;
}

/** Cancels an open invoice. If it was the last overdue one, billing leaves 'overdue'. Null when not open. */
export async function settleInvoiceVoid(admin: Admin, id: string) {
  const { data: inv } = await admin.from("billing_invoices").update({ status: "void" }).eq("id", id).eq("status", "open").select("organization_id, amount, due_at, external_id, provider").maybeSingle();
  if (!inv) return null;
  const { data: bill } = await admin.from("organization_billing").select("status").eq("organization_id", inv.organization_id).maybeSingle();
  if (bill?.status === "overdue" && !(await hasOverdueInvoices(admin, inv.organization_id))) {
    await admin.from("organization_billing").update({ status: "ok", updated_at: new Date().toISOString() }).eq("organization_id", inv.organization_id);
  }
  return inv;
}

/** An invoice went past due at the provider: the buffet's billing shows 'overdue'. */
export async function flagOverdue(admin: Admin, orgId: string) {
  await admin.from("organization_billing").update({ status: "overdue", updated_at: new Date().toISOString() }).eq("organization_id", orgId).neq("status", "overdue");
}
