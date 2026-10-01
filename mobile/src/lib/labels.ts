export type EventStatus = "QUOTE" | "PRE_RESERVED" | "CONFIRMED" | "DONE" | "CANCELLED" | "EXPIRED";
export type Tone = "amber" | "green" | "slate" | "red" | "zinc" | "brand";

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  QUOTE: "Orçamento",
  PRE_RESERVED: "Aguardando confirmação",
  CONFIRMED: "Confirmado",
  DONE: "Realizado",
  CANCELLED: "Cancelado",
  EXPIRED: "Reserva vencida",
};
export const EVENT_STATUS_TONE: Record<EventStatus, Tone> = {
  QUOTE: "zinc", PRE_RESERVED: "amber", CONFIRMED: "green", DONE: "slate", CANCELLED: "red", EXPIRED: "zinc",
};

export type PaymentMethod = "PIX" | "CASH" | "CARD" | "TRANSFER" | "OTHER";
export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = { PIX: "Pix", CASH: "Dinheiro", CARD: "Cartão", TRANSFER: "Transferência", OTHER: "Outro" };

export const QUOTE_STATUS_LABEL: Record<string, string> = { DRAFT: "Rascunho", SENT: "Enviado", ACCEPTED: "Aceito", REJECTED: "Recusado", EXPIRED: "Vencido" };
export const CONTRACT_STATUS_LABEL: Record<string, string> = { DRAFT: "Rascunho", SENT: "Aguardando aceite", ACCEPTED: "Aceito", CANCELLED: "Cancelado" };
