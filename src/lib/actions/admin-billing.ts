"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/data/session";
import { logAdminAction } from "@/lib/admin/audit";
import { fail, translateDbError, type ActionResult } from "@/lib/action-result";
import { billingProvider } from "@/lib/billing/provider";
import { PAYMENT_METHODS } from "@/lib/billing/invoices";
import { toDateKey } from "@/lib/utils";
import { dateSchema, formToObject, moneySchema, optionalText, uuid, zodFieldErrors } from "./helpers";

/** Komyx invoices, charged by hand until a payment provider is chosen (/admin/cobranca). */

type Admin = ReturnType<typeof createAdminClient>;

function revalidate(orgId: string) {
  revalidatePath("/admin/cobranca");
  revalidatePath(`/admin/buffets/${orgId}`);
  revalidatePath("/conta");
}

/** Demo buffets and the platform org are never billed. */
async function billableOrg(admin: Admin, id: string) {
  const { data } = await admin.from("organizations").select("id, name, kind, is_demo").eq("id", id).maybeSingle();
  return data && data.kind === "buffet" && !data.is_demo ? data : null;
}

async function hasOverdueInvoices(admin: Admin, orgId: string) {
  const { count } = await admin.from("billing_invoices").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "open").lt("due_at", toDateKey(new Date()));
  return (count ?? 0) > 0;
}

const createSchema = z.object({
  organization_id: uuid,
  period_start: dateSchema,
  period_end: dateSchema,
  amount: moneySchema,
  due_at: dateSchema,
  notes: optionalText,
}).refine((d) => d.period_end >= d.period_start, { path: ["period_end"], message: "O fim deve ser depois do início" });

export async function adminCreateInvoice(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const profile = await requireAdmin();
  const parsed = createSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fail("Verifique os campos.", zodFieldErrors(parsed.error));
  const d = parsed.data;
  const admin = createAdminClient();
  const org = await billableOrg(admin, d.organization_id);
  if (!org) return fail("Este buffet não é cobrado (demo ou plataforma).");
  const { data: inv, error } = await admin.from("billing_invoices").insert({ ...d, status: "open", created_by: profile.id }).select("id").single();
  if (error || !inv) return fail(translateDbError(error));
  await billingProvider.createCharge({ invoiceId: inv.id, organizationId: org.id, amount: d.amount, dueAt: d.due_at, description: `Komyx · ${org.name}` });
  await logAdminAction(profile, "invoice.create", { organizationId: org.id, details: { invoice_id: inv.id, amount: d.amount, period_start: d.period_start, period_end: d.period_end, due_at: d.due_at } });
  revalidate(org.id);
  return { ok: true, message: "Fatura gerada." };
}

const paidSchema = z.object({ id: uuid, paid_at: dateSchema, method: z.enum(PAYMENT_METHODS.map((m) => m.value) as [string, ...string[]]) });

export async function adminMarkInvoicePaid(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const profile = await requireAdmin();
  const parsed = paidSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fail("Verifique os campos.", zodFieldErrors(parsed.error));
  const { id, paid_at, method } = parsed.data;
  const admin = createAdminClient();
  // Only an open invoice flips to paid: a second click (or a stale page) changes nothing.
  const { data: inv, error } = await admin.from("billing_invoices").update({ status: "paid", paid_at, method }).eq("id", id).eq("status", "open").select("organization_id, period_start, period_end, amount").maybeSingle();
  if (error) return fail(translateDbError(error));
  if (!inv) return fail("Esta fatura não está mais em aberto.");

  // Rule: a paid invoice pays its period. The buffet's cycle becomes period_start → period_end (due_at is
  // the next charge) and billing goes back to 'ok'. The cycle only moves forward (paying an old invoice
  // never pulls due_at back), and billing stays 'overdue' while another open invoice is past due.
  const { data: bill } = await admin.from("organization_billing").select("due_at").eq("organization_id", inv.organization_id).maybeSingle();
  const forward = !bill?.due_at || inv.period_end >= bill.due_at;
  const status = (await hasOverdueInvoices(admin, inv.organization_id)) ? "overdue" : "ok";
  await admin.from("organization_billing").upsert({
    organization_id: inv.organization_id,
    status,
    ...(forward ? { cycle_start: inv.period_start, due_at: inv.period_end } : {}),
    updated_at: new Date().toISOString(),
  });
  await logAdminAction(profile, "invoice.paid", { organizationId: inv.organization_id, details: { invoice_id: id, amount: inv.amount, paid_at, method } });
  revalidate(inv.organization_id);
  return { ok: true, message: "Pagamento registrado." };
}

/** Cancels an open invoice. If it was the last overdue one, billing leaves 'overdue'. */
export async function adminVoidInvoice(formData: FormData) {
  const profile = await requireAdmin();
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return;
  const admin = createAdminClient();
  const { data: inv } = await admin.from("billing_invoices").update({ status: "void" }).eq("id", id.data).eq("status", "open").select("organization_id, amount, due_at").maybeSingle();
  if (!inv) return;
  await billingProvider.cancelCharge(null);
  const { data: bill } = await admin.from("organization_billing").select("status").eq("organization_id", inv.organization_id).maybeSingle();
  if (bill?.status === "overdue" && !(await hasOverdueInvoices(admin, inv.organization_id))) {
    await admin.from("organization_billing").update({ status: "ok", updated_at: new Date().toISOString() }).eq("organization_id", inv.organization_id);
  }
  await logAdminAction(profile, "invoice.void", { organizationId: inv.organization_id, details: { invoice_id: id.data, amount: inv.amount, due_at: inv.due_at } });
  revalidate(inv.organization_id);
}

const priceSchema = z.object({
  organization_id: uuid,
  // Empty = back to the plan's list price.
  monthly_price: z.union([z.literal(""), moneySchema]).transform((v) => (v === "" ? null : v)),
});

export async function adminUpdateMonthlyPrice(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const profile = await requireAdmin();
  const parsed = priceSchema.safeParse({ ...formToObject(formData), monthly_price: String(formData.get("monthly_price") ?? "").trim() });
  if (!parsed.success) return fail("Valor inválido.", zodFieldErrors(parsed.error));
  const { organization_id, monthly_price } = parsed.data;
  const admin = createAdminClient();
  if (!(await billableOrg(admin, organization_id))) return fail("Este buffet não é cobrado.");
  const { data: before } = await admin.from("organization_billing").select("monthly_price").eq("organization_id", organization_id).maybeSingle();
  const { error } = await admin.from("organization_billing").upsert({ organization_id, monthly_price, updated_at: new Date().toISOString() });
  if (error) return fail(translateDbError(error));
  await logAdminAction(profile, "billing.price", { organizationId: organization_id, details: { from: before?.monthly_price ?? null, to: monthly_price } });
  revalidate(organization_id);
  return { ok: true, message: "Salvo." };
}
