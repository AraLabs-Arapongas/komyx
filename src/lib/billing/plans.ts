import { BILLING_PERIODS, MONTHLY_PRICE } from "@/lib/billing";
import { addMonths } from "./invoices";

// No "server-only": the owner screens and the admin pages share these rules (docs/assinatura.md).

export type PeriodMonths = 1 | 3 | 6 | 12;
export const PERIOD_MONTHS: readonly PeriodMonths[] = [1, 3, 6, 12];
export const isPeriodMonths = (n: unknown): n is PeriodMonths => PERIOD_MONTHS.includes(Number(n) as PeriodMonths);

export const ASAAS_CYCLE: Record<PeriodMonths, "MONTHLY" | "QUARTERLY" | "SEMIANNUALLY" | "YEARLY"> = { 1: "MONTHLY", 3: "QUARTERLY", 6: "SEMIANNUALLY", 12: "YEARLY" };
export const PERIOD_LABEL: Record<PeriodMonths, string> = { 1: "Mensal", 3: "3 meses", 6: "6 meses", 12: "12 meses" };
export const planName = (months: number) => (isPeriodMonths(months) ? PERIOD_LABEL[months] : `${months} meses`);

/** Days late on which the owner gets a notice; the access pauses on PAUSE_DAY. */
export const NOTICE_DAYS = [1, 5, 9] as const;
export const PAUSE_DAY = 10;
/** A payment can be refunded in full up to this many days after it was made. */
export const FULL_REFUND_DAYS = 7;
export const HELP_EMAIL = "contato@komyx.com.br";

/**
 * What one charge of a plan costs. Monthly uses the buffet's negotiated monthly_price when the admin set
 * one; longer plans are the prepaid prices of BILLING_PERIODS (402, 714, 1.188).
 */
export function periodPrice(months: number, monthlyPrice?: number | null) {
  if (months === 1) return monthlyPrice ?? MONTHLY_PRICE;
  const p = BILLING_PERIODS.find((b) => b.months === months);
  return (p?.perMonth ?? MONTHLY_PRICE) * months;
}

export function planOptions(monthlyPrice?: number | null) {
  return PERIOD_MONTHS.map((months) => ({
    months,
    label: PERIOD_LABEL[months],
    total: periodPrice(months, monthlyPrice),
    perMonth: periodPrice(months, monthlyPrice) / months,
    hint: months === 1 ? "todo mês" : "de uma vez",
  }));
}

/** YYYY-MM-DD plus n days. */
export function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Whole days from a to b (b − a), both YYYY-MM-DD. */
export function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
}

/** "07/03/2027" */
export const brDate = (d: string) => d.split("-").reverse().join("/");
/** "07/03" */
export const brDay = (d: string) => brDate(d).slice(0, 5);

/** Which months of a prepaid period have started by `today` (the month that started counts as used). */
export function monthsUsed(periodStart: string, today: string) {
  let m = 1;
  while (addMonths(periodStart, m) <= today) m++;
  return m;
}

/** What is missing for Komyx to charge the buffet (Asaas needs both). Empty = ready. */
export function billingDataMissing(org: { document: string | null; whatsapp: string | null }) {
  const missing: string[] = [];
  const doc = (org.document ?? "").replace(/\D/g, "");
  if (doc.length !== 11 && doc.length !== 14) missing.push("CNPJ/CPF");
  const phone = (org.whatsapp ?? "").replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (phone.length !== 10 && phone.length !== 11) missing.push("WhatsApp");
  return missing;
}

export type LateInvoice = { id: string; due_at: string; status: string; payment_url: string | null; amount: number };

/**
 * How late the buffet is. Late since the earliest open invoice past its due date, or since the end of the
 * trial when it ended without a subscription (status still 'trial', so no invoice yet). day 1 = the day
 * after the due date; pauses on day 10. payBy = last day to pay before the pause.
 */
export function lateState(bill: { status: string; due_at: string | null } | null, open: LateInvoice[], today: string) {
  const overdue = open.filter((i) => i.status === "open" && i.due_at < today).sort((a, b) => a.due_at.localeCompare(b.due_at));
  const candidates = [overdue[0]?.due_at, bill?.status === "trial" && bill.due_at && bill.due_at < today ? bill.due_at : undefined].filter(Boolean) as string[];
  if (!candidates.length) return null;
  const since = candidates.sort()[0];
  return {
    since,
    day: daysBetween(since, today),
    payBy: addDays(since, PAUSE_DAY - 1),
    pauseOn: addDays(since, PAUSE_DAY),
    invoice: overdue[0] ?? open.find((i) => i.status === "open") ?? null,
  };
}

/** The notice due today for a late buffet: the latest of days 1/5/9 reached (a missed run still sends it), or 10. */
export function noticeDay(day: number): 1 | 5 | 9 | 10 | null {
  if (day >= PAUSE_DAY) return 10;
  const reached = NOTICE_DAYS.filter((d) => d <= day);
  return reached.length ? reached[reached.length - 1] : null;
}

export type PaidInvoice = { id: string; amount: number; paid_at: string | null; period_start: string; period_end: string; months: number; provider: string; external_id: string | null };

export type CancelOption = {
  key: "keep" | "full_7_days" | "prorata";
  refund: number;
  /** Access ends on this day (same convention as organizations.access_until / billing due_at). */
  accessUntil: string;
  invoiceId: string | null;
};

/**
 * Cancellation choices (docs/assinatura.md §5):
 * - keep: no refund, use until the end of what is paid (or the trial);
 * - full_7_days: up to 7 days after a payment, that whole payment back and access ends now;
 * - prorata (3/6/12 months): paid − months used × R$ 149, month started counts, never negative; access
 *   until the end of the last month counted.
 */
export function cancelOptions(input: { dueAt: string | null; lastPaid: PaidInvoice | null; today: string }) {
  const { dueAt, lastPaid, today } = input;
  const keepUntil = dueAt && dueAt > today ? dueAt : today;
  const options: CancelOption[] = [{ key: "keep", refund: 0, accessUntil: keepUntil, invoiceId: null }];
  let monthIndex: number | null = null;
  if (!lastPaid?.paid_at) return { options, monthIndex };
  const amount = Number(lastPaid.amount);
  if (daysBetween(lastPaid.paid_at, today) <= FULL_REFUND_DAYS && amount > 0) {
    // Paid ahead for a period that has not started: the period paid before it stays (my call).
    const until = lastPaid.period_start > today ? lastPaid.period_start : addDays(today, -1);
    options.push({ key: "full_7_days", refund: amount, accessUntil: until, invoiceId: lastPaid.id });
  }
  if (lastPaid.months > 1 && lastPaid.period_start <= today && today < lastPaid.period_end) {
    monthIndex = monthsUsed(lastPaid.period_start, today);
    const refund = Math.max(0, Math.round((amount - monthIndex * MONTHLY_PRICE) * 100) / 100);
    if (refund > 0) options.push({ key: "prorata", refund, accessUntil: addMonths(lastPaid.period_start, monthIndex), invoiceId: lastPaid.id });
  }
  return { options, monthIndex };
}
