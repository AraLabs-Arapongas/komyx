"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOwner } from "@/lib/data/session";
import { fail, translateDbError, type ActionResult } from "@/lib/action-result";
import { asaasConfigured } from "@/lib/billing/asaas";
import { BillingSetupError, enableAutoBilling } from "@/lib/billing/asaas-sync";
import { cancelWithOption, changePlan, logBilling, maybeAutoEnable, subscriptionContext } from "@/lib/billing/subscription";
import { billingDataMissing, brDate, isPeriodMonths, PERIOD_LABEL } from "@/lib/billing/plans";
import { formatCurrency } from "@/lib/utils";
import { phoneSchema, zodFieldErrors } from "./helpers";

const DATA_RETENTION_DAYS = 90;

function revalidateBilling() {
  revalidatePath("/", "layout");
  revalidatePath("/conta");
  revalidatePath("/admin/cobranca");
}

const asaasError = (e: unknown) => (e instanceof BillingSetupError ? e.message : `Não deu para falar com o sistema de cobrança agora. Tente de novo em instantes. (${e instanceof Error ? e.message : String(e)})`);

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
 * "Assinar agora" during the trial: the subscription starts now with the chosen plan, so the first charge
 * (due on the last day of the trial) can be paid right away. Paying early keeps the remaining free days.
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
    await logBilling(admin, profile, "billing.auto_on", org.id, { ...r, source: "assinar agora" });
    revalidateBilling();
    return { ok: true, message: "Assinatura feita! A fatura aparece em instantes em Faturas, com o link para pagar." };
  } catch (e) {
    return fail(asaasError(e));
  }
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
export async function reactivateSubscription() {
  const profile = await requireOwner();
  const admin = createAdminClient();
  const { data: org } = await admin.from("organizations").select("status").eq("id", profile.organization_id).single();
  if (org?.status !== "cancelled") redirect("/home");
  const { error } = await admin.from("organizations").update({ status: "active", cancelled_at: null, cancel_reason: null, access_until: null }).eq("id", profile.organization_id);
  if (error) throw new Error(translateDbError(error));
  await logBilling(admin, profile, "subscription.reactivate", profile.organization_id);
  // Back on the Asaas subscription (first charge at the end of what is paid, or today). Best effort:
  // without the data the trial banner / late notices ask for it.
  if (asaasConfigured()) {
    const auto = await maybeAutoEnable(admin, profile.organization_id);
    if (!auto.enabled) {
      const { org: o, bill } = await subscriptionContext(admin, profile.organization_id);
      if (o && bill && !bill.provider_subscription_id && !billingDataMissing(o).length) {
        await enableAutoBilling(admin, profile.organization_id).catch((e) => console.error("[billing] reactivate", e));
      }
    }
  }
  revalidatePath("/", "layout");
  redirect("/conta?reativada=1#assinatura");
}

const dataSchema = z.object({
  document: z.string().transform((v) => v.replace(/\D/g, "")).refine((v) => v.length === 11 || v.length === 14, "CPF (11 dígitos) ou CNPJ (14 dígitos)"),
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
