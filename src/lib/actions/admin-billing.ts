"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/data/session";
import { logAdminAction } from "@/lib/admin/audit";
import { fail, translateDbError, type ActionResult } from "@/lib/action-result";
import { asaasConfigured } from "@/lib/billing/asaas";
import { BillingSetupError, cancelCharge, chargeInvoice, disableAutoBilling, enableAutoBilling } from "@/lib/billing/asaas-sync";
import { settleInvoicePaid, settleInvoiceVoid } from "@/lib/billing/settle";
import { PAYMENT_METHODS } from "@/lib/billing/invoices";
import { dateSchema, formToObject, moneySchema, optionalText, uuid, zodFieldErrors } from "./helpers";

/** Komyx invoices (/admin/cobranca): by hand, or through Asaas when ASAAS_API_KEY is set. */

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
  // With Asaas the invoice also becomes a charge with a payment link; if that fails it stays manual.
  let charged = "";
  if (asaasConfigured()) {
    try { await chargeInvoice(admin, inv.id); charged = " Cobrança criada no Asaas."; }
    catch (e) { charged = ` Não deu para criar no Asaas: ${e instanceof Error ? e.message : String(e)}`; }
  }
  await logAdminAction(profile, "invoice.create", { organizationId: org.id, details: { invoice_id: inv.id, amount: d.amount, period_start: d.period_start, period_end: d.period_end, due_at: d.due_at } });
  revalidate(org.id);
  return { ok: true, message: `Fatura gerada.${charged}` };
}

const paidSchema = z.object({ id: uuid, paid_at: dateSchema, method: z.enum(PAYMENT_METHODS.map((m) => m.value) as [string, ...string[]]) });

export async function adminMarkInvoicePaid(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const profile = await requireAdmin();
  const parsed = paidSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fail("Verifique os campos.", zodFieldErrors(parsed.error));
  const { id, paid_at, method } = parsed.data;
  const admin = createAdminClient();
  // Only an open invoice flips to paid: a second click (or a stale page) changes nothing.
  const inv = await settleInvoicePaid(admin, id, paid_at, method);
  if (!inv) return fail("Esta fatura não está mais em aberto.");
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
  const inv = await settleInvoiceVoid(admin, id.data);
  if (!inv) return;
  if (inv.provider === "asaas" && inv.external_id) await cancelCharge(inv.external_id).catch((e) => console.error("[asaas] cancel", e));
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

/** Turns the Asaas monthly subscription on or off for a buffet. */
export async function adminSetAutoBilling(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const profile = await requireAdmin();
  const orgId = uuid.safeParse(formData.get("organization_id"));
  if (!orgId.success) return fail("Buffet inválido.");
  const on = formData.get("on") === "1";
  if (!asaasConfigured()) return fail("Configure o Asaas (ASAAS_API_KEY) primeiro.");
  const admin = createAdminClient();
  if (!(await billableOrg(admin, orgId.data))) return fail("Este buffet não é cobrado.");
  try {
    if (on) {
      const r = await enableAutoBilling(admin, orgId.data);
      await logAdminAction(profile, "billing.auto_on", { organizationId: orgId.data, details: r });
      revalidate(orgId.data);
      return { ok: true, message: `Cobrança automática ligada. Primeira cobrança em ${r.nextDueDate?.split("-").reverse().join("/") ?? "—"}.` };
    }
    await disableAutoBilling(admin, orgId.data);
    // Saving Configurações › Empresa must not turn it back on by itself.
    await admin.from("organization_billing").update({ auto_billing_disabled_at: new Date().toISOString() }).eq("organization_id", orgId.data);
    await logAdminAction(profile, "billing.auto_off", { organizationId: orgId.data });
    revalidate(orgId.data);
    return { ok: true, message: "Cobrança automática desligada." };
  } catch (e) {
    return fail(e instanceof BillingSetupError ? e.message : `Asaas: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** "Reembolsar R$ X por Pix": the admin sent the refund by hand (boleto, or Asaas refused it). */
export async function adminMarkRefundDone(formData: FormData) {
  const profile = await requireAdmin();
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return;
  const admin = createAdminClient();
  const { data: r } = await admin.from("billing_refunds").update({ status: "done", method: "pix", done_at: new Date().toISOString(), done_by: profile.id })
    .eq("id", id.data).in("status", ["manual", "requested"]).select("organization_id, amount, reason").maybeSingle();
  if (!r) return;
  await logAdminAction(profile, "refund.pix", { organizationId: r.organization_id, details: { refund_id: id.data, amount: r.amount, reason: r.reason } });
  revalidate(r.organization_id);
}
