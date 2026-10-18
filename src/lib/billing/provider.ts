/**
 * Where a Komyx invoice gets charged. Today there is only the "manual" provider: the invoice lives in
 * billing_invoices, Komyx sends the Pix/boleto by WhatsApp and the admin marks it paid in /admin/cobranca.
 *
 * A real provider (Asaas, Mercado Pago, Stripe) would implement the same shape: createCharge() registers
 * the invoice with them and returns their id and a payment link; their webhook would then call the same
 * "mark paid" logic the admin uses. Nothing else in the app should need to change.
 */

export type ChargeInput = {
  invoiceId: string;
  organizationId: string;
  amount: number;
  dueAt: string; // YYYY-MM-DD
  description: string;
};

export type ChargeResult = {
  /** Id of the charge at the provider (null for manual). */
  externalId: string | null;
  /** Link the owner opens to pay (null for manual). */
  paymentUrl: string | null;
};

export interface BillingProvider {
  id: "manual" | "asaas" | "mercadopago" | "stripe";
  /** Registers the charge for a newly created invoice. */
  createCharge(input: ChargeInput): Promise<ChargeResult>;
  /** Cancels the charge when the admin voids the invoice. */
  cancelCharge(externalId: string | null): Promise<void>;
  /** What the owner reads next to their open invoices. */
  ownerInstructions: string;
}

export const manualProvider: BillingProvider = {
  id: "manual",
  async createCharge() {
    return { externalId: null, paymentUrl: null };
  },
  async cancelCharge() {},
  ownerInstructions: "A Komyx envia os dados de pagamento pelo WhatsApp.",
};

/** The provider in use. Swap here once one is chosen. */
export const billingProvider: BillingProvider = manualProvider;
