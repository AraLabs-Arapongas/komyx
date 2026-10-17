"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data/session";
import { fail, translateDbError, type ActionResult } from "@/lib/action-result";
import { uuid } from "./helpers";

const decideSchema = z.object({
  id: uuid,
  decision: z.enum(["APPROVED", "REJECTED"]),
  reply: z.string().trim().max(500, "Resposta muito longa (até 500 caracteres).").optional().transform((v) => (v ? v : null)),
});

/**
 * The buffet answers a client request. It is only an acknowledgement: the party is not changed here
 * (the owner does that on the event page), so approving "mais 10 pessoas" does not edit the head count.
 */
export async function decideChangeRequest(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = decideSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Verifique os campos.");
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_change_requests")
    .update({ status: parsed.data.decision, reply: parsed.data.reply, decided_at: new Date().toISOString(), decided_by: profile.id })
    .eq("id", parsed.data.id)
    .eq("status", "PENDING")
    .select("event_id, created_at")
    .maybeSingle();
  if (error) return fail(translateDbError(error));
  if (!data) return fail("Este pedido já foi respondido.");

  // The notification is inserted by the request's trigger in the same transaction, so it shares created_at.
  await supabase.from("notifications").update({ read_at: new Date().toISOString() })
    .eq("type", "client_request").eq("href", `/eventos/${data.event_id}`).eq("created_at", data.created_at).is("read_at", null);

  revalidatePath("/solicitacoes");
  revalidatePath(`/eventos/${data.event_id}`);
  revalidatePath("/notificacoes");
  revalidatePath("/home");
  return { ok: true, message: parsed.data.decision === "APPROVED" ? "Pedido aprovado." : "Pedido recusado." };
}
