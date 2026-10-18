"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadReservation } from "@/lib/data/reservation";
import { fail, translateDbError, type ActionResult } from "@/lib/action-result";
import { formatCurrency } from "@/lib/utils";

/** "Já paguei": the client says how much went by Pix; the buffet checks the statement and records it. */
export async function notifyPayment(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const token = String(formData.get("token") ?? "");
  const amount = Math.round(Number(formData.get("amount") ?? 0) * 100) / 100;
  const r = await loadReservation(token);
  if (!r) return fail("Reserva não encontrada.");
  if (!(amount >= 1)) return fail("Informe quanto você pagou (mínimo R$ 1,00).");
  if (r.balance > 0 && amount > r.balance) return fail(`O valor passa do que falta pagar (${formatCurrency(r.balance)}).`);
  const admin = createAdminClient();
  const { count } = await admin.from("event_change_requests").select("id", { count: "exact", head: true }).eq("event_id", r.event.id).eq("kind", "PAYMENT_NOTICE").eq("status", "PENDING");
  // Approving a notice closes every pending one, so only one waits at a time.
  if (count) return fail("Você já avisou um pagamento. Assim que o buffet conferir, dá para avisar outro.");
  const txid = r.event.pix_txid ?? `FESTA${r.event.id.replace(/-/g, "").slice(0, 10).toUpperCase()}`;
  const first = (r.event.customers?.name ?? "Cliente").split(" ")[0];
  const { error } = await admin.rpc("reservation_request_change", {
    p_token: token, p_kind: "PAYMENT_NOTICE",
    p_message: `${first} avisou que pagou ${formatCurrency(amount)} por Pix (${txid}).`,
    p_payload: { amount, txid },
  });
  if (error) return fail(translateDbError({ ...error, message: error.message.replace(/^.*?: /, "") }));
  revalidatePath(`/r/${token}`);
  return { ok: true, message: "Aviso enviado. O buffet confirma assim que vir o Pix no extrato." };
}
