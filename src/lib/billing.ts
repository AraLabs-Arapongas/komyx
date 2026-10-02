/**
 * Komyx subscription (what the buffet pays). Launch offer: whoever joins now has Premium at the Básico price, for good,
 * so both plans cost the same today. Charging itself is not wired yet; support handles changes.
 */
export const LAUNCH_PRICE = 99;
export const PLAN_PRICES: Record<string, number> = { basic: LAUNCH_PRICE, premium: LAUNCH_PRICE };
export const PLAN_LABEL: Record<string, string> = { basic: "Básico", premium: "Premium" };
export const BILLING_STATUS_LABEL: Record<string, string> = { ok: "Em dia", due: "Vence em breve", overdue: "Em atraso", trial: "Período de teste" };
export const INVOICE_STATUS_LABEL: Record<string, string> = { open: "Em aberto", paid: "Paga", overdue: "Em atraso", cancelled: "Cancelada" };
export const INVOICE_STATUS_TONE: Record<string, "amber" | "green" | "red" | "zinc"> = { open: "amber", paid: "green", overdue: "red", cancelled: "zinc" };
export const SUPPORT_WHATSAPP = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "5511999999999";
