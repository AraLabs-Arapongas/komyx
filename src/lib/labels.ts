import type { Database } from "@/lib/database.types";

export type EventStatus = Database["public"]["Enums"]["event_status"];
export type QuoteStatus = Database["public"]["Enums"]["quote_status"];
export type PaymentMethod = Database["public"]["Enums"]["payment_method"];
export type DiscountType = Database["public"]["Enums"]["discount_type"];

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  QUOTE: "Orçamento",
  PRE_RESERVED: "Aguardando confirmação",
  CONFIRMED: "Confirmado",
  DONE: "Realizado",
  CANCELLED: "Cancelado",
  EXPIRED: "Expirada",
};

export const EVENT_STATUS_TONE: Record<EventStatus, "amber" | "green" | "slate" | "red" | "zinc"> = {
  QUOTE: "zinc",
  PRE_RESERVED: "amber",
  CONFIRMED: "green",
  DONE: "slate",
  CANCELLED: "red",
  EXPIRED: "zinc",
};

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  DRAFT: "Rascunho",
  SENT: "Aguardando confirmação",
  ACCEPTED: "Aceito",
  REJECTED: "Recusado",
};

export const QUOTE_STATUS_TONE: Record<QuoteStatus, "amber" | "green" | "slate" | "red" | "zinc"> = {
  DRAFT: "zinc",
  SENT: "amber",
  ACCEPTED: "green",
  REJECTED: "red",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  PIX: "Pix",
  CASH: "Dinheiro",
  CARD: "Cartão",
  TRANSFER: "Transferência",
  OTHER: "Outro",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  UNPAID: "Não pago",
  PARTIAL: "Parcial",
  PAID: "Pago",
};

export const PAYMENT_STATUS_TONE: Record<string, "amber" | "green" | "slate" | "red" | "zinc"> = {
  UNPAID: "red",
  PARTIAL: "amber",
  PAID: "green",
};
