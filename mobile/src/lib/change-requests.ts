import { confirmEventRemote } from "./confirm";
import { supabase, WEB_URL } from "./supabase";

export type OwnerRequest = {
  id: string; event_id: string; kind: "EXTRA" | "PEOPLE" | "PAYMENT_NOTICE" | "OTHER"; message: string | null;
  payload: { description?: string; price?: number; addon_id?: string; adults?: number; children?: number; amount?: number; txid?: string } | null;
  status: "PENDING" | "APPROVED" | "REJECTED"; created_at: string;
  events: { title: string | null; starts_at: string; adults: number | null; children: number | null; customers: { name: string; whatsapp: string } | null } | null;
};

export const REQUEST_KIND_LABEL: Record<OwnerRequest["kind"], string> = { EXTRA: "Pedido de extra", PEOPLE: "Mudar número de pessoas", PAYMENT_NOTICE: "Cliente avisou pagamento", OTHER: "Outro pedido" };

export async function loadOwnerRequests(onlyPending: boolean) {
  let q = supabase.from("event_change_requests").select("id, event_id, kind, message, payload, status, created_at, events(title, starts_at, adults, children, customers(name, whatsapp))").order("created_at", { ascending: false }).limit(60);
  if (onlyPending) q = q.eq("status", "PENDING");
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as OwnerRequest[];
}

export async function pendingRequestsCount() {
  const { count } = await supabase.from("event_change_requests").select("id", { count: "exact", head: true }).eq("status", "PENDING");
  return count ?? 0;
}

const decide = async (id: string, status: "APPROVED" | "REJECTED") => {
  const { error } = await supabase.from("event_change_requests").update({ status, decided_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
};

/** Same server routine as the site (/api/change-requests/[id]/decide), with the staff member's session. */
async function decideRemote(id: string, body: { approve: boolean; reply?: string | null; amount?: number; price?: number }) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Faça login de novo.");
  const res = await fetch(`${WEB_URL}/api/change-requests/${id}/decide`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  if (!res.ok || !json.ok) throw new Error(json.error ?? `Não foi possível responder (erro ${res.status}).`);
}

/**
 * Approving applies the request on the server: new head counts go onto the party and its quote
 * (total and instalments follow), an extra goes into the party's extras (price as typed), a payment
 * notice records the payment (which can confirm the party and send the contract).
 */
export async function approveRequest(r: OwnerRequest, price?: number) {
  if (r.kind === "PAYMENT_NOTICE") {
    const amount = price ?? Number(r.payload?.amount ?? 0);
    if (!(amount > 0)) throw new Error("Informe o valor recebido.");
    return decideRemote(r.id, { approve: true, amount });
  }
  return decideRemote(r.id, { approve: true, price: r.kind === "EXTRA" ? price : undefined });
}

export const rejectRequest = (id: string) => decideRemote(id, { approve: false });

/**
 * The payment behind a "já paguei" was already recorded by hand: close the notice and make sure
 * the party is fully confirmed (quote accepted, contract sent, quote link), without a new payment.
 */
export async function noticeAlreadyRecorded(r: OwnerRequest) {
  await decide(r.id, "APPROVED");
  await confirmEventRemote(r.event_id, {});
}
