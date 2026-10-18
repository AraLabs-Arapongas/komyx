"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOwner } from "@/lib/data/session";
import { fail, translateDbError, type ActionResult } from "@/lib/action-result";
import { asaasConfigured } from "@/lib/billing/asaas";
import { BillingSetupError, chargeInvoice, enableAutoBilling, startReactivation } from "@/lib/billing/asaas-sync";
import { cancelWithOption, changePlan, logBilling, maybeAutoEnable, subscriptionContext } from "@/lib/billing/subscription";
import { billingDataMissing, brDate, isPeriodMonths, PERIOD_LABEL } from "@/lib/billing/plans";
import { INVALID_DOCUMENT, isValidDocument } from "@/lib/document";
import { formatCurrency } from "@/lib/utils";
import { phoneSchema, zodFieldErrors } from "./helpers";

const DATA_RETENTION_DAYS = 90;

function revalidateBilling() {
  revalidatePath("/", "layout");
  revalidatePath("/assinatura");
  revalidatePath("/admin/cobranca");
}

const asaasError = (e: unknown) => {
  if (e instanceof BillingSetupError) return e.message;
  const msg = e instanceof Error ? e.message : String(e);
  // Asaas rejected the data (400), not an outage: say what to fix instead of "try again".
  if (/CPF|CNPJ/i.test(msg)) return "O CPF/CNPJ do buffet foi recusado pelo sistema de cobrança. Confira os números em Configurações › Empresa.";
  return `Não deu para falar com o sistema de cobrança agora. Tente de novo em instantes. (${msg})`;
};

/** Minha conta › Seu plano: choose a plan (applies now in the trial, on the next renewal after that). */
export async function choosePlan(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const months = Number(formData.get("months"));
  if (!isPeriodMonths(months)) return fail("Plano inválido.");
  const profile = await requireOwner();
  const admin = createAdminClient();
  try {
    const r = await changePlan(admin, profile.organization_id, months, profile);
    revalidateBilling();
    if (r.mode === "same") return { ok: true, message: `Você já está no plano ${PERIOD_LABEL[months]}.` };
    if (r.mode === "undone") return { ok: true, message: `Troca desfeita. Você continua no plano ${PERIOD_LABEL[months]}.` };
    if (r.mode === "now") return { ok: true, message: `Plano ${PERIOD_LABEL[months]} escolhido.` };
    return { ok: true, message: `A partir de ${brDate(r.from!)} você passa para o plano ${PERIOD_LABEL[months]}.` };
  } catch (e) {
    return fail(asaasError(e));
  }
}

/** "Desfazer" on the scheduled change: back to the plan in force. */
export async function undoPlanChange(): Promise<ActionResult> {
  const profile = await requireOwner();
  const admin = createAdminClient();
  const { data: bill } = await admin.from("organization_billing").select("billing_period, pending_period").eq("organization_id", profile.organization_id).maybeSingle();
  if (!bill?.pending_period || !isPeriodMonths(bill.billing_period)) return { ok: true, message: "Nenhuma troca agendada." };
  try {
    await changePlan(admin, profile.organization_id, bill.billing_period, profile);
    revalidateBilling();
    return { ok: true, message: `Troca desfeita. Você continua no plano ${PERIOD_LABEL[bill.billing_period]}.` };
  } catch (e) {
    return fail(asaasError(e));
  }
}

/**
 * "Assinar" (trial, or no subscription yet): the Asaas subscription starts with the plan in force and the
 * owner goes straight to the first charge on the Asaas page (Pix, boleto or card). Paying early keeps the
 * remaining free days: the charge is due on the last day of the trial.
 */
export async function subscribeNow(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const months = Number(formData.get("months"));
  const profile = await requireOwner();
  const admin = createAdminClient();
  const { org, bill } = await subscriptionContext(admin, profile.organization_id);
  if (!org || !bill) return fail("Assinatura não encontrada.");
  const missing = billingDataMissing(org);
  if (missing.length) return fail(`Complete ${missing.join(" e ")} do buffet em Configurações › Empresa para assinar.`);
  if (!asaasConfigured()) return fail("A cobrança online ainda não está ligada. Fale com o suporte pelo WhatsApp.");
  try {
    if (isPeriodMonths(months) && months !== bill.billing_period) await changePlan(admin, org.id, months, profile);
    const r = await enableAutoBilling(admin, org.id);
    await logBilling(admin, profile, "billing.auto_on", org.id, { ...r, source: "assinar" });
  } catch (e) {
    return fail(asaasError(e));
  }
  revalidateBilling();
  const { data: first } = await admin.from("billing_invoices").select("payment_url").eq("organization_id", profile.organization_id).eq("status", "open").not("payment_url", "is", null).order("due_at").limit(1).maybeSingle();
  if (first?.payment_url) redirect(first.payment_url);
  return { ok: true, message: "Assinatura feita. A fatura aparece aqui em instantes, com o botão para pagar." };
}

const cancelSchema = z.object({
  reason: z.string().trim().max(200).optional().transform((v) => v || null),
  confirm: z.literal("CANCELAR"),
  option: z.enum(["keep", "full_7_days", "prorata"]).optional().default("keep"),
});

/**
 * Owner cancels (docs/assinatura.md §5): the chosen option decides the refund and the last day of access.
 * The Asaas subscription is turned off; after access_until the app shows /cancelada with "Reativar".
 */
export async function cancelSubscription(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = cancelSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Digite CANCELAR para confirmar.", { confirm: "Digite CANCELAR" });
  const profile = await requireOwner();
  const admin = createAdminClient();
  try {
    const { option, refundStatus } = await cancelWithOption(admin, profile.organization_id, parsed.data.option, parsed.data.reason, profile);
    revalidateBilling();
    const refund = option.refund > 0
      ? ` Vamos devolver ${formatCurrency(option.refund)}${refundStatus === "manual" ? " por Pix em até 5 dias úteis" : " pelo mesmo meio do pagamento"}.`
      : "";
    const access = option.key === "full_7_days" && option.accessUntil < new Date().toISOString().slice(0, 10) ? "Seu acesso terminou." : `Você ainda tem acesso até ${brDate(option.accessUntil)}.`;
    return { ok: true, message: `Assinatura cancelada.${refund} ${access} Os dados ficam guardados por ${DATA_RETENTION_DAYS} dias depois disso.` };
  } catch (e) {
    return fail(asaasError(e));
  }
}

/** Owner reactivates: same data, same page, same links. The subscription starts again when it can. */
/**
 * Cancelled buffet: "Pagar e reativar". Opens the Asaas payment page for one plan period; the Asaas
 * webhook reactivates the buffet when the payment is confirmed (settleInvoicePaid). Nothing changes before.
 */
export async function reactivateSubscription(): Promise<ActionResult> {
  const profile = await requireOwner();
  const admin = createAdminClient();
  const { data: org } = await admin.from("organizations").select("status, document, whatsapp").eq("id", profile.organization_id).single();
  if (org?.status !== "cancelled") redirect("/home");
  const missing = billingDataMissing(org);
  if (missing.length) return fail(`Para pagar, complete ${missing.join(" e ")} em Configurações › Empresa.`);
  if (!asaasConfigured()) return fail("Pagamento online indisponível agora. Fale com a gente pelo WhatsApp.");
  let url: string;
  try {
    url = await startReactivation(admin, profile.organization_id);
  } catch (e) {
    return fail(asaasError(e));
  }
  await logBilling(admin, profile, "subscription.reactivate_requested", profile.organization_id);
  redirect(url);
}

/**
 * "Pagar" on /assinatura: opens the invoice on the Asaas page. An invoice without a link yet (created by
 * the admin, or Asaas was down) gets its Asaas charge now, so there is always a payment page to open.
 */
export async function payInvoice(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return fail("Fatura inválida.");
  const profile = await requireOwner();
  const admin = createAdminClient();
  const { data: inv } = await admin.from("billing_invoices").select("id, status, payment_url").eq("id", id.data).eq("organization_id", profile.organization_id).maybeSingle();
  if (!inv || inv.status !== "open") return fail("Esta fatura não está mais em aberto. Recarregue a página.");
  if (inv.payment_url) redirect(inv.payment_url);
  if (!asaasConfigured()) return fail("Pagamento online indisponível agora. Fale com a gente pelo WhatsApp.");
  try {
    await chargeInvoice(admin, inv.id);
  } catch (e) {
    return fail(asaasError(e));
  }
  const { data: charged } = await admin.from("billing_invoices").select("payment_url").eq("id", inv.id).single();
  if (!charged?.payment_url) return fail("Não deu para abrir o pagamento agora. Tente de novo em instantes.");
  revalidateBilling();
  redirect(charged.payment_url);
}

const dataSchema = z.object({
  document: z.string().transform((v) => v.replace(/\D/g, "")).refine((v) => v.length === 11 || v.length === 14, "CPF (11 dígitos) ou CNPJ (14 dígitos)").refine(isValidDocument, INVALID_DOCUMENT),
  whatsapp: phoneSchema,
});

/**
 * Paused screen without a charge yet (trial ended without the data): the owner fills CNPJ/CPF + WhatsApp
 * right there, and the subscription starts so there is something to pay.
 */
export async function completeBillingData(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = dataSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Verifique os campos.", zodFieldErrors(parsed.error));
  const profile = await requireOwner();
  const admin = createAdminClient();
  const { error } = await admin.from("organizations").update({ document: parsed.data.document, whatsapp: parsed.data.whatsapp }).eq("id", profile.organization_id);
  if (error) return fail(translateDbError(error));
  const auto = await maybeAutoEnable(admin, profile.organization_id);
  revalidatePath("/pausado");
  return auto.enabled ? { ok: true, message: "Dados salvos. A cobrança foi gerada: pague abaixo." } : { ok: true, message: "Dados salvos. A cobrança aparece aqui em instantes; se não aparecer, fale com a gente." };
}
