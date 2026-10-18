import "server-only";

/**
 * Asaas API v3 (https://docs.asaas.com). Configure with:
 *   ASAAS_API_KEY        the account's API key ($aact_... in production, $aact_hmlg_... in the sandbox)
 *   ASAAS_ENV            "production" or "sandbox" (default sandbox, so a stray key never bills for real)
 *   ASAAS_WEBHOOK_TOKEN  the "Token de autenticação" set on the webhook in the Asaas panel
 */
const BASE = process.env.ASAAS_ENV === "production" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";

export const asaasConfigured = () => Boolean(process.env.ASAAS_API_KEY);
export const asaasEnv = () => (process.env.ASAAS_ENV === "production" ? "production" : "sandbox");

async function call<T>(method: "GET" | "POST" | "DELETE", path: string, body?: unknown): Promise<T> {
  const key = process.env.ASAAS_API_KEY;
  if (!key) throw new Error("ASAAS_API_KEY não configurada");
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "content-type": "application/json", access_token: key, "user-agent": "Komyx" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = (await res.json().catch(() => null)) as (T & { errors?: { description?: string }[] }) | null;
  if (!res.ok) throw new Error(`Asaas ${res.status}: ${data?.errors?.map((e) => e.description).join("; ") || res.statusText}`);
  return data as T;
}

export type AsaasPayment = {
  id: string;
  customer: string;
  subscription?: string | null;
  value: number;
  dueDate: string; // YYYY-MM-DD
  paymentDate?: string | null;
  clientPaymentDate?: string | null;
  billingType: "PIX" | "BOLETO" | "CREDIT_CARD" | "UNDEFINED" | string;
  status: string;
  invoiceUrl?: string | null;
  externalReference?: string | null;
  description?: string | null;
};

export async function createCustomer(c: { name: string; cpfCnpj: string; email?: string | null; mobilePhone?: string | null; externalReference: string }) {
  return call<{ id: string }>("POST", "/customers", { ...c, notificationDisabled: false });
}

export async function updateCustomer(id: string, c: { name: string; cpfCnpj: string; email?: string | null; mobilePhone?: string | null }) {
  return call<{ id: string }>("POST", `/customers/${id}`, c);
}

/** Monthly charge until cancelled. billingType UNDEFINED lets the buffet pick Pix, boleto or card. */
export async function createSubscription(s: { customer: string; value: number; nextDueDate: string; description: string; externalReference: string }) {
  return call<{ id: string }>("POST", "/subscriptions", { ...s, billingType: "UNDEFINED", cycle: "MONTHLY" });
}

export async function cancelSubscription(id: string) {
  return call<{ deleted: boolean }>("DELETE", `/subscriptions/${id}`);
}

/** One-off charge (an invoice the admin created by hand). */
export async function createPayment(p: { customer: string; value: number; dueDate: string; description: string; externalReference: string }) {
  return call<AsaasPayment>("POST", "/payments", { ...p, billingType: "UNDEFINED" });
}

export async function deletePayment(id: string) {
  return call<{ deleted: boolean }>("DELETE", `/payments/${id}`);
}

/** Maps Asaas' billing type to our payment method values (src/lib/billing/invoices.ts). */
export function methodFromBillingType(t: string) {
  return t === "PIX" ? "pix" : t === "BOLETO" ? "boleto" : t === "CREDIT_CARD" ? "cartao" : "outro";
}
