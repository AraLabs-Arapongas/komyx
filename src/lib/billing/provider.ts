import "server-only";
import { asaasConfigured, asaasEnv } from "./asaas";

/**
 * Who charges Komyx's monthly fee. With ASAAS_API_KEY set it is Asaas (subscription per buffet, one-off
 * charges for invoices made by hand, webhook settles them; see asaas-sync.ts). Without it everything is
 * manual: the invoice lives in billing_invoices and the admin marks it paid in /admin/cobranca.
 */
export function billingProviderInfo() {
  const on = asaasConfigured();
  return {
    id: on ? ("asaas" as const) : ("manual" as const),
    label: on ? `Asaas${asaasEnv() === "sandbox" ? " (sandbox)" : ""}` : "Manual",
    ownerInstructions: on ? "Pague pelo link da fatura: Pix, boleto ou cartão. A baixa é automática." : "A Komyx envia os dados de pagamento pelo WhatsApp.",
  };
}
