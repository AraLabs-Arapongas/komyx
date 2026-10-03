import { supabase, WEB_URL } from "./supabase";

export type ConfirmPayment = { amount: number; method?: "PIX" | "CASH" | "CARD" | "TRANSFER" | "OTHER"; paid_at?: string; notes?: string | null };

/**
 * Confirms a party the same way the site does (one server routine for both): optional payment,
 * event CONFIRMED, quote accepted, contract sent to the client, quote PDF link, "já paguei"
 * notices cleared. Uses the signed-in staff member's session.
 */
export async function confirmEventRemote(eventId: string, body: { confirm?: boolean; payment?: ConfirmPayment }) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Faça login de novo.");
  const res = await fetch(`${WEB_URL}/api/events/${eventId}/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; confirmed?: boolean; contract?: boolean };
  if (!res.ok || !json.ok) throw new Error(json.error ?? `Não foi possível confirmar (erro ${res.status}).`);
  return json;
}
