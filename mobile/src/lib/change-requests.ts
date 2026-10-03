import { confirmEventRemote } from "./confirm";
import { supabase } from "./supabase";

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

/**
 * Approving applies the request: an extra goes into the party's extras (price as typed),
 * new head counts go onto the event, a payment notice records the payment (which can confirm the
 * party and send the contract), anything else is just marked handled.
 */
export async function approveRequest(r: OwnerRequest, organizationId: string, userId: string, price?: number) {
  if (r.kind === "EXTRA") {
    const description = r.payload?.description ?? r.message ?? "Extra";
    const { error } = await supabase.from("event_extras").insert({ organization_id: organizationId, event_id: r.event_id, addon_id: r.payload?.addon_id ?? null, description, quantity: 1, unit_price: price ?? Number(r.payload?.price ?? 0), source: "STAFF", created_by: userId });
    if (error) throw new Error(error.message);
  } else if (r.kind === "PEOPLE") {
    const patch: { adults?: number; children?: number } = {};
    if (typeof r.payload?.adults === "number") patch.adults = r.payload.adults;
    if (typeof r.payload?.children === "number") patch.children = r.payload.children;
    if (Object.keys(patch).length) {
      const { error } = await supabase.from("events").update(patch).eq("id", r.event_id);
      if (error) throw new Error(error.message);
    }
  } else if (r.kind === "PAYMENT_NOTICE") {
    const amount = price ?? Number(r.payload?.amount ?? 0);
    if (!(amount > 0)) throw new Error("Informe o valor recebido.");
    await confirmEventRemote(r.event_id, { payment: { amount, method: "PIX", notes: `Pix avisado pelo cliente${r.payload?.txid ? ` · ${r.payload.txid}` : ""}` } });
    return; // the server marks the notice approved
  }
  await decide(r.id, "APPROVED");
}

export const rejectRequest = (id: string) => decide(id, "REJECTED");

/**
 * The payment behind a "já paguei" was already recorded by hand: close the notice and make sure
 * the party is fully confirmed (quote accepted, contract sent, quote link), without a new payment.
 */
export async function noticeAlreadyRecorded(r: OwnerRequest) {
  await decide(r.id, "APPROVED");
  await confirmEventRemote(r.event_id, {});
}
