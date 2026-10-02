/**
 * Komyx subscription (what the buffet pays). One plan with everything; the price per month depends on the
 * commitment period (monthly, 3, 6 or 12 months prepaid). Both legacy plan codes cost the same today.
 * Charging itself is not wired yet; support handles changes.
 */
/** Price per month by commitment period. Longer periods are prepaid and cheaper per month. */
export const BILLING_PERIODS = [
  { months: 1, label: "Mensal", perMonth: 149 },
  { months: 3, label: "3 meses", perMonth: 134 },
  { months: 6, label: "6 meses", perMonth: 119 },
  { months: 12, label: "Anual", perMonth: 99 },
] as const;
export const MONTHLY_PRICE = 149;
/** "De" price shown struck through next to the monthly price. */
export const LIST_PRICE = 199;
/** Free trial length for every new buffet (see migration trial_billing). */
export const TRIAL_DAYS = 30;
/** Cheapest per-month price (annual), used in "a partir de" copy. */
export const LAUNCH_PRICE = 99;
export const PLAN_PRICES: Record<string, number> = { basic: MONTHLY_PRICE, premium: MONTHLY_PRICE };
export const PLAN_LABEL: Record<string, string> = { basic: "Básico", premium: "Premium" };
export const BILLING_STATUS_LABEL: Record<string, string> = { ok: "Em dia", due: "Vence em breve", overdue: "Em atraso", trial: "Período de teste" };
export const INVOICE_STATUS_LABEL: Record<string, string> = { open: "Em aberto", paid: "Paga", overdue: "Em atraso", cancelled: "Cancelada" };
export const INVOICE_STATUS_TONE: Record<string, "amber" | "green" | "red" | "zinc"> = { open: "amber", paid: "green", overdue: "red", cancelled: "zinc" };
export const SUPPORT_WHATSAPP = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "5511999999999";
