import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import { toDateKey } from "@/lib/utils";
import { addMonths } from "./invoices";
import { cancelSubscription, createCustomer, createPayment, createSubscription, deletePayment, listSubscriptionPayments, methodFromBillingType, updateCustomer, updateSubscription, type AsaasPayment } from "./asaas";
import { flagOverdue, settleInvoicePaid, settleInvoiceVoid } from "./settle";
import { isValidDocument } from "@/lib/document";
import { ASAAS_CYCLE, PERIOD_LABEL, isPeriodMonths, periodPrice, type PeriodMonths } from "./plans";

/** Keeps a buffet's Komyx fee in sync with Asaas (customer, monthly subscription, charges). */

type Admin = ReturnType<typeof createAdminClient>;

export class BillingSetupError extends Error {}

/**
 * The buffet's Asaas customer, created on first use (or refreshed) from its legal data, WhatsApp and the
 * owner's e-mail. Asaas sends the charge reminders to that e-mail and phone, so both are required.
 */
export async function ensureCustomer(admin: Admin, orgId: string) {
  const [{ data: bill }, { data: org }, { data: owner }] = await Promise.all([
    admin.from("organization_billing").select("provider_customer_id").eq("organization_id", orgId).maybeSingle(),
    admin.from("organizations").select("name, legal_name, document, whatsapp").eq("id", orgId).single(),
    admin.from("profiles").select("email").eq("organization_id", orgId).eq("role", "owner").order("created_at").limit(1).maybeSingle(),
  ]);
  const doc = (org?.document ?? "").replace(/\D/g, "");
  if (doc.length !== 11 && doc.length !== 14) throw new BillingSetupError("Cadastre o CPF ou CNPJ do buffet (Configurações › Empresa) antes de cobrar pelo Asaas.");
  if (!isValidDocument(doc)) throw new BillingSetupError("O CPF/CNPJ do buffet é inválido. Corrija em Configurações › Empresa.");
  const phone = (org?.whatsapp ?? "").replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (phone.length !== 10 && phone.length !== 11) throw new BillingSetupError("Cadastre o WhatsApp do buffet (Configurações › Empresa) antes de cobrar pelo Asaas.");
  if (!owner?.email) throw new BillingSetupError("O buffet não tem um responsável com e-mail para receber as cobranças.");
  const data = { name: org?.legal_name || org!.name, cpfCnpj: doc, email: owner.email, mobilePhone: phone };
  if (bill?.provider_customer_id) {
    await updateCustomer(bill.provider_customer_id, data);
    return bill.provider_customer_id;
  }
  const c = await createCustomer({ ...data, externalReference: orgId });
  await admin.from("organization_billing").upsert({ organization_id: orgId, provider_customer_id: c.id, updated_at: new Date().toISOString() });
  return c.id;
}

/**
 * Turns on the subscription for the buffet's plan (billing_period: 1, 3, 6 or 12 months). The first
 * charge is due when the trial / paid cycle ends (organization_billing.due_at), or today if that passed.
 */
export async function enableAutoBilling(admin: Admin, orgId: string) {
  const customer = await ensureCustomer(admin, orgId);
  const [{ data: org }, { data: bill }] = await Promise.all([
    admin.from("organizations").select("name").eq("id", orgId).single(),
    admin.from("organization_billing").select("due_at, monthly_price, provider_subscription_id, billing_period").eq("organization_id", orgId).maybeSingle(),
  ]);
  if (bill?.provider_subscription_id) return { subscriptionId: bill.provider_subscription_id, nextDueDate: bill.due_at };
  const today = toDateKey(new Date());
  const nextDueDate = bill?.due_at && bill.due_at > today ? bill.due_at : today;
  const months: PeriodMonths = isPeriodMonths(bill?.billing_period) ? bill.billing_period : 1;
  const value = periodPrice(months, bill?.monthly_price);
  const sub = await createSubscription({ customer, value, nextDueDate, cycle: ASAAS_CYCLE[months], description: subscriptionDescription(months, org!.name), externalReference: orgId });
  await admin.from("organization_billing").upsert({ organization_id: orgId, provider_subscription_id: sub.id, auto_billing: true, auto_billing_disabled_at: null, updated_at: new Date().toISOString() });
  // Mirror the first charge now (the webhook does it too), so its payment link shows up at once.
  try {
    const { data } = await listSubscriptionPayments(sub.id);
    for (const p of data ?? []) await applyAsaasEvent(admin, "PAYMENT_CREATED", p);
  } catch (e) {
    console.error("[asaas] first charge", e);
  }
  return { subscriptionId: sub.id, nextDueDate, value, months };
}

function subscriptionDescription(months: PeriodMonths, buffet: string) {
  return `Komyx · plano ${PERIOD_LABEL[months]} · ${buffet}`;
}

/**
 * Points the Asaas subscription at a plan from `nextDueDate` on (plan change on the next renewal, or its
 * undo). No-op without a subscription.
 */
export async function updateSubscriptionPlan(admin: Admin, orgId: string, months: PeriodMonths, nextDueDate: string) {
  const [{ data: org }, { data: bill }] = await Promise.all([
    admin.from("organizations").select("name").eq("id", orgId).single(),
    admin.from("organization_billing").select("monthly_price, provider_subscription_id").eq("organization_id", orgId).maybeSingle(),
  ]);
  if (!bill?.provider_subscription_id) return false;
  await updateSubscription(bill.provider_subscription_id, { value: periodPrice(months, bill.monthly_price), cycle: ASAAS_CYCLE[months], nextDueDate, description: subscriptionDescription(months, org?.name ?? "") });
  return true;
}

/** Months a subscription charge due on `dueDate` pays: the scheduled plan from pending_from on. */
function monthsForCharge(bill: { billing_period: number; pending_period: number | null; pending_from: string | null }, dueDate: string): PeriodMonths {
  const m = bill.pending_period && bill.pending_from && dueDate >= bill.pending_from ? bill.pending_period : bill.billing_period;
  return isPeriodMonths(m) ? m : 1;
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
  // Asaas refuses a due date in the past (a late invoice created by hand): charge it for today.
  const today = toDateKey(new Date());
  const p = await createPayment({ customer, value: Number(inv.amount), dueDate: inv.due_at < today ? today : inv.due_at, description: `Komyx · ${org?.name} · ${brDate(inv.period_start)} a ${brDate(inv.period_end)}`, externalReference: inv.id });
  await admin.from("billing_invoices").update({ provider: "asaas", external_id: p.id, payment_url: p.invoiceUrl ?? null }).eq("id", inv.id);
}

/**
 * "Pagar e reativar" for a cancelled buffet: one charge for its plan, paid on the Asaas page. The buffet
 * comes back only when the payment is confirmed (settleInvoicePaid). The period starts when the access
 * still paid for ends (or today), so no paid day is lost. Reuses the open reactivation charge if any.
 * Returns the Asaas payment page.
 */
export async function startReactivation(admin: Admin, orgId: string, chosen?: PeriodMonths) {
  const [{ data: org }, { data: bill }, { data: pendingRow }] = await Promise.all([
    admin.from("organizations").select("access_until").eq("id", orgId).single(),
    admin.from("organization_billing").select("monthly_price, billing_period").eq("organization_id", orgId).maybeSingle(),
    admin.from("billing_invoices").select("id, payment_url, months, provider, external_id").eq("organization_id", orgId).eq("status", "open").eq("notes", REACTIVATION_NOTE).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const months: PeriodMonths = chosen ?? (isPeriodMonths(bill?.billing_period) ? bill.billing_period : 1);
  let pending = pendingRow;
  // Another plan was chosen: the old reactivation charge goes away.
  if (pending && pending.months !== months) {
    if (pending.provider === "asaas" && pending.external_id) await deletePayment(pending.external_id).catch((e) => console.error("[asaas] delete reactivation", e));
    await admin.from("billing_invoices").update({ status: "void" }).eq("id", pending.id).eq("status", "open");
    pending = null;
  }
  // The plan of the reactivation is the one the subscription restarts with once paid.
  await admin.from("organization_billing").update({ billing_period: months, pending_period: null, pending_from: null }).eq("organization_id", orgId);
  if (pending?.payment_url) return pending.payment_url;
  const today = toDateKey(new Date());
  const start = org?.access_until && org.access_until > today ? org.access_until : today;
  let id = pending?.id;
  if (!id) {
    const { data: inv, error } = await admin.from("billing_invoices").insert({
      organization_id: orgId, period_start: start, period_end: addMonths(start, months), amount: periodPrice(months, bill?.monthly_price),
      due_at: today, status: "open", months, notes: REACTIVATION_NOTE,
    }).select("id").single();
    if (error || !inv) throw new Error(error?.message ?? "invoice");
    id = inv.id;
  }
  await chargeInvoice(admin, id);
  const { data: charged } = await admin.from("billing_invoices").select("payment_url").eq("id", id).single();
  if (!charged?.payment_url) throw new Error("Asaas não devolveu o link de pagamento.");
  return charged.payment_url;
}

const REACTIVATION_NOTE = "Reativação da assinatura";

/**
 * Late buffet changes plan to pay ("Alterar o plano" next to "Pagar"): the unpaid charge is replaced by
 * one for the new plan, covering the same unpaid period from its start. It keeps the old due date, so the
 * buffet stays late (and paused, if it was) until this one is paid. The Asaas subscription moves to the new
 * plan from the end of that period. Returns the Asaas payment page of the new charge.
 */
export async function switchLatePlan(admin: Admin, orgId: string, months: PeriodMonths) {
  const today = toDateKey(new Date());
  const { data: late } = await admin.from("billing_invoices").select("id, period_start, due_at, months, provider, external_id, payment_url")
    .eq("organization_id", orgId).eq("status", "open").lt("due_at", today).order("due_at").limit(1).maybeSingle();
  if (!late) throw new BillingSetupError("Não há mensalidade atrasada para trocar. Recarregue a página.");
  if (late.months === months) {
    if (!late.payment_url) await chargeInvoice(admin, late.id);
    const { data } = await admin.from("billing_invoices").select("payment_url").eq("id", late.id).single();
    return data?.payment_url ?? null;
  }
  const { data: bill } = await admin.from("organization_billing").select("monthly_price").eq("organization_id", orgId).maybeSingle();
  // Drop the old charge at Asaas first; its PAYMENT_DELETED webhook then finds the invoice already void.
  if (late.provider === "asaas" && late.external_id) await deletePayment(late.external_id).catch((e) => console.error("[asaas] delete late charge", e));
  await admin.from("billing_invoices").update({ status: "void", notes: "Trocada por outro plano no atraso" }).eq("id", late.id).eq("status", "open");
  const periodEnd = addMonths(late.period_start, months);
  const { data: inv, error } = await admin.from("billing_invoices").insert({
    organization_id: orgId, period_start: late.period_start, period_end: periodEnd, amount: periodPrice(months, bill?.monthly_price),
    due_at: late.due_at, status: "open", months, notes: `Plano ${PERIOD_LABEL[months]} no lugar da fatura atrasada`,
  }).select("id").single();
  if (error || !inv) throw new Error(error?.message ?? "invoice");
  await admin.from("organization_billing").update({ billing_period: months, pending_period: null, pending_from: null, updated_at: new Date().toISOString() }).eq("organization_id", orgId);
  await updateSubscriptionPlan(admin, orgId, months, periodEnd).catch((e) => console.error("[asaas] late plan subscription", e));
  await chargeInvoice(admin, inv.id);
  const { data: charged } = await admin.from("billing_invoices").select("payment_url").eq("id", inv.id).single();
  return charged?.payment_url ?? null;
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
  const { data: bill } = await admin.from("organization_billing").select("organization_id, billing_period, pending_period, pending_from").eq("provider_subscription_id", p.subscription).maybeSingle();
  if (!bill) return null;
  // A subscription charge pays the plan's months starting on its due date.
  const months = monthsForCharge(bill, p.dueDate);
  const { data: created } = await admin.from("billing_invoices").insert({
    organization_id: bill.organization_id, period_start: p.dueDate, period_end: addMonths(p.dueDate, months), months, amount: p.value, due_at: p.dueDate,
    status: "open", provider: "asaas", external_id: p.id, payment_url: p.invoiceUrl ?? null, notes: months === 1 ? "Mensalidade (assinatura Asaas)" : `Plano ${PERIOD_LABEL[months]} (assinatura Asaas)`,
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
    case "PAYMENT_UPDATED": {
      if (inv.status !== "open") return "atualizada";
      // A plan change rewrites the pending charge (value/date): its period follows.
      const { data: bill } = p.subscription ? await admin.from("organization_billing").select("billing_period, pending_period, pending_from").eq("organization_id", inv.organization_id).maybeSingle() : { data: null };
      const months = bill ? monthsForCharge(bill, p.dueDate) : null;
      await admin.from("billing_invoices").update({
        amount: p.value, due_at: p.dueDate, payment_url: p.invoiceUrl ?? null,
        ...(months ? { months, period_start: p.dueDate, period_end: addMonths(p.dueDate, months) } : {}),
      }).eq("id", inv.id);
      return "atualizada";
    }
    case "PAYMENT_RECEIVED":
    case "PAYMENT_CONFIRMED":
    case "PAYMENT_RECEIVED_IN_CASH": {
      const paidAt = p.clientPaymentDate || p.paymentDate || toDateKey(new Date());
      const done = await settleInvoicePaid(admin, inv.id, paidAt, methodFromBillingType(p.billingType));
      if (done?.reactivated) await enableAutoBilling(admin, inv.organization_id).catch((e) => console.error("[asaas] reactivate", e));
      return done ? (done.reactivated ? "paga · reativada" : "paga") : "já estava paga";
    }
    case "PAYMENT_OVERDUE":
      await flagOverdue(admin, inv.organization_id);
      return "vencida";
    case "PAYMENT_DELETED":
      return (await settleInvoiceVoid(admin, inv.id)) ? "cancelada" : "já estava fechada";
    case "PAYMENT_REFUNDED":
    case "PAYMENT_PARTIALLY_REFUNDED": {
      // A paid invoice stays paid (it was); the refund we asked for on cancellation is done.
      if (inv.status === "open") return (await settleInvoiceVoid(admin, inv.id)) ? "cancelada" : "já estava fechada";
      const { data: done } = await admin.from("billing_refunds").update({ status: "done", done_at: new Date().toISOString(), method: "asaas" }).eq("invoice_id", inv.id).eq("status", "requested").select("id");
      return done?.length ? "reembolso confirmado" : "reembolso sem pedido no Komyx";
    }
    default:
      return "ignorado";
  }
}
