/** Festeja subscription plans (what the buffet pays). Charging itself is not wired yet; support handles changes. */
export const PLAN_PRICES: Record<string, number> = { basic: 99, premium: 199 };
export const PLAN_LABEL: Record<string, string> = { basic: "Básico", premium: "Premium" };
export const BILLING_STATUS_LABEL: Record<string, string> = { ok: "Em dia", due: "Vence em breve", overdue: "Em atraso", trial: "Período de teste" };
export const INVOICE_STATUS_LABEL: Record<string, string> = { open: "Em aberto", paid: "Paga", overdue: "Em atraso", cancelled: "Cancelada" };
export const INVOICE_STATUS_TONE: Record<string, "amber" | "green" | "red" | "zinc"> = { open: "amber", paid: "green", overdue: "red", cancelled: "zinc" };
export const SUPPORT_WHATSAPP = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "5511999999999";
