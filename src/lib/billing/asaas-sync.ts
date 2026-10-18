import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import { toDateKey } from "@/lib/utils";
import { addMonths, effectivePrice } from "./invoices";
import { cancelSubscription, createCustomer, createPayment, createSubscription, deletePayment, methodFromBillingType, type AsaasPayment } from "./asaas";
import { flagOverdue, settleInvoicePaid, settleInvoiceVoid } from "./settle";

/** Keeps a buffet's Komyx fee in sync with Asaas (customer, monthly subscription, charges). */

type Admin = ReturnType<typeof createAdminClient>;

export class BillingSetupError extends Error {}

/** The buffet's Asaas customer, created on first use from its legal data and the owner's e-mail. */
export async function ensureCustomer(admin: Admin, orgId: string) {
  const { data: bill } = await admin.from("organization_billing").select("provider_customer_id").eq("organization_id", orgId).maybeSingle();
  if (bill?.provider_customer_id) return bill.provider_customer_id;
  const [{ data: org }, { data: owner }] = await Promise.all([
    admin.from("organizations").select("name, legal_name, document, whatsapp").eq("id", orgId).single(),
    admin.from("profiles").select("email").eq("organization_id", orgId).eq("role", "owner").order("created_at").limit(1).maybeSingle(),
  ]);
  const doc = (org?.document ?? "").replace(/\D/g, "");
  if (doc.length !== 11 && doc.length !== 14) throw new BillingSetupError("Cadastre o CPF ou CNPJ do buffet (Configurações › Empresa) antes de cobrar pelo Asaas.");
  const phone = (org?.whatsapp ?? "").replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  const c = await createCustomer({ name: org?.legal_name || org!.name, cpfCnpj: doc, email: owner?.email ?? null, mobilePhone: phone || null, externalReference: orgId });
  await admin.from("organization_billing").upsert({ organization_id: orgId, provider_customer_id: c.id, updated_at: new Date().toISOString() });
  return c.id;
}

/**
 * Turns on the monthly subscription. The first charge is due when the trial / paid cycle ends
 * (organization_billing.due_at), or today if that already passed.
 */
export async function enableAutoBilling(admin: Admin, orgId: string) {
  const customer = await ensureCustomer(admin, orgId);
  const [{ data: org }, { data: bill }] = await Promise.all([
    admin.from("organizations").select("name, plan").eq("id", orgId).single(),
    admin.from("organization_billing").select("due_at, monthly_price, provider_subscription_id").eq("organization_id", orgId).maybeSingle(),
  ]);
  if (bill?.provider_subscription_id) return { subscriptionId: bill.provider_subscription_id, nextDueDate: bill.due_at };
  const today = toDateKey(new Date());
  const nextDueDate = bill?.due_at && bill.due_at > today ? bill.due_at : today;
  const value = effectivePrice(bill?.monthly_price ?? null, org!.plan);
  const sub = await createSubscription({ customer, value, nextDueDate, description: `Komyx · plano ${org!.plan === "premium" ? "Premium" : "Básico"} · ${org!.name}`, externalReference: orgId });
  await admin.from("organization_billing").upsert({ organization_id: orgId, provider_subscription_id: sub.id, auto_billing: true, updated_at: new Date().toISOString() });
  return { subscriptionId: sub.id, nextDueDate, value };
}

/** Stops the subscription (Asaas removes its pending charges; the webhook voids them here). */
export async function disableAutoBilling(admin: Admin, orgId: string) {
  const { data: bill } = await admin.from("organization_billing").select("provider_subscription_id").eq("organization_id", orgId).maybeSingle();
  if (bill?.provider_subscription_id) await cancelSubscription(bill.provider_subscription_id);
  await admin.from("organization_billing").update({ provider_subscription_id: null, auto_billing: false, updated_at: new Date().toISOString() }).eq("organization_id", orgId);
}

/** Registers an invoice the admin created by hand as a one-off Asaas charge, with its payment link. */
export async function chargeInvoice(admin: Admin, invoiceId: string) {
  const { data: inv } = await admin.from("billing_invoices").select("id, organization_id, amount, due_at, period_start, period_end, external_id").eq("id", invoiceId).single();
  if (!inv || inv.external_id) return;
  const customer = await ensureCustomer(admin, inv.organization_id);
  const { data: org } = await admin.from("organizations").select("name").eq("id", inv.organization_id).single();
  const brDate = (d: string) => d.split("-").reverse().join("/");
  const p = await createPayment({ customer, value: Number(inv.amount), dueDate: inv.due_at, description: `Komyx · ${org?.name} · ${brDate(inv.period_start)} a ${brDate(inv.period_end)}`, externalReference: inv.id });
  await admin.from("billing_invoices").update({ provider: "asaas", external_id: p.id, payment_url: p.invoiceUrl ?? null }).eq("id", inv.id);
}

/** Cancels the Asaas charge behind an invoice the admin voided. */
export async function cancelCharge(externalId: string) {
  await deletePayment(externalId);
}

/** The billing_invoices row for an Asaas charge, creating it for subscription charges we have not seen. */
async function invoiceFor(admin: Admin, p: AsaasPayment) {
  const { data: byExternal } = await admin.from("billing_invoices").select("id, organization_id, status").eq("provider", "asaas").eq("external_id", p.id).maybeSingle();
  if (byExternal) return byExternal;
  // A one-off charge carries our invoice id as externalReference.
  if (p.externalReference && !p.subscription) {
    const { data: byRef } = await admin.from("billing_invoices").select("id, organization_id, status").eq("id", p.externalReference).maybeSingle();
    if (byRef) {
      await admin.from("billing_invoices").update({ provider: "asaas", external_id: p.id, payment_url: p.invoiceUrl ?? null }).eq("id", byRef.id);
      return byRef;
    }
  }
  if (!p.subscription) return null;
  const { data: bill } = await admin.from("organization_billing").select("organization_id").eq("provider_subscription_id", p.subscription).maybeSingle();
  if (!bill) return null;
  // A monthly charge pays the month that starts on its due date.
  const { data: created } = await admin.from("billing_invoices").insert({
    organization_id: bill.organization_id, period_start: p.dueDate, period_end: addMonths(p.dueDate, 1), amount: p.value, due_at: p.dueDate,
    status: "open", provider: "asaas", external_id: p.id, payment_url: p.invoiceUrl ?? null, notes: "Mensalidade (assinatura Asaas)",
  }).select("id, organization_id, status").single();
  return created;
}

/**
 * Applies one webhook event. Unknown events are ignored. Returns what happened, for the event log.
 * PAYMENT_CREATED/UPDATED keep the row and link fresh; RECEIVED/CONFIRMED settle it; OVERDUE flags the
 * buffet; DELETED/REFUNDED cancel it.
 */
export async function applyAsaasEvent(admin: Admin, event: string, p: AsaasPayment | undefined) {
  if (!p?.id) return "sem cobrança";
  const inv = await invoiceFor(admin, p);
  if (!inv) return "cobrança de fora do Komyx";
  switch (event) {
    case "PAYMENT_CREATED":
    case "PAYMENT_UPDATED":
      if (inv.status === "open") await admin.from("billing_invoices").update({ amount: p.value, due_at: p.dueDate, payment_url: p.invoiceUrl ?? null }).eq("id", inv.id);
      return "atualizada";
    case "PAYMENT_RECEIVED":
    case "PAYMENT_CONFIRMED":
    case "PAYMENT_RECEIVED_IN_CASH": {
      const paidAt = p.clientPaymentDate || p.paymentDate || toDateKey(new Date());
      const done = await settleInvoicePaid(admin, inv.id, paidAt, methodFromBillingType(p.billingType));
      return done ? "paga" : "já estava paga";
    }
    case "PAYMENT_OVERDUE":
      await flagOverdue(admin, inv.organization_id);
      return "vencida";
    case "PAYMENT_DELETED":
    case "PAYMENT_REFUNDED":
      return (await settleInvoiceVoid(admin, inv.id)) ? "cancelada" : "já estava fechada";
    default:
      return "ignorado";
  }
}
