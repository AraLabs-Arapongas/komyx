import { PLAN_PRICES, MONTHLY_PRICE } from "@/lib/billing";

/**
 * Komyx invoices (billing_invoices). Dates are YYYY-MM-DD. A period runs from period_start up to
 * period_end, the day the next one starts and is charged (same convention as organization_billing:
 * cycle_start → due_at, where due_at is the next charge / end of what is paid).
 */

export type InvoiceStatus = "open" | "paid" | "void";
/** Status as shown: an open invoice past its due date is "overdue". */
export type InvoiceView = "open" | "overdue" | "paid" | "void";

export function invoiceView(inv: { status: string; due_at: string }, today: string): InvoiceView {
  if (inv.status === "open") return inv.due_at < today ? "overdue" : "open";
  return inv.status === "paid" ? "paid" : "void";
}

export const INVOICE_VIEW_LABEL: Record<InvoiceView, string> = { open: "Em aberto", overdue: "Vencida", paid: "Paga", void: "Cancelada" };
export const INVOICE_VIEW_TONE: Record<InvoiceView, "amber" | "red" | "green" | "zinc"> = { open: "amber", overdue: "red", paid: "green", void: "zinc" };

export const PAYMENT_METHODS = [
  { value: "pix", label: "Pix" },
  { value: "boleto", label: "Boleto" },
  { value: "cartao", label: "Cartão" },
  { value: "transferencia", label: "Transferência" },
  { value: "outro", label: "Outro" },
] as const;
export const PAYMENT_METHOD_LABEL: Record<string, string> = Object.fromEntries(PAYMENT_METHODS.map((m) => [m.value, m.label]));

/** Adds months to a YYYY-MM-DD date, clamping to the end of a shorter month (31/01 + 1 = 28/02). */
export function addMonths(date: string, months: number) {
  const [y, m, d] = date.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, last));
  return target.toISOString().slice(0, 10);
}

/** Price the buffet pays per month: its own monthly_price, else the plan's list price. */
export function effectivePrice(monthlyPrice: number | null | undefined, plan: string) {
  return monthlyPrice ?? PLAN_PRICES[plan] ?? MONTHLY_PRICE;
}

/**
 * Default period for the next invoice: it starts where the last open/paid invoice ended, or at the
 * billing due_at (end of the trial or of the paid cycle), and lasts one month. It is due on its first day.
 */
export function nextPeriod(billing: { due_at: string | null } | null | undefined, lastPeriodEnd: string | null, today: string) {
  const base = billing?.due_at ?? today;
  const start = lastPeriodEnd && lastPeriodEnd > base ? lastPeriodEnd : base;
  return { start, end: addMonths(start, 1), due: start };
}

/** "149,00" for a money input (pt-BR, parsed back by moneySchema). */
export function moneyInput(value: number | null | undefined) {
  return value == null ? "" : value.toFixed(2).replace(".", ",");
}
