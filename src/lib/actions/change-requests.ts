"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getOrganization, requireProfile } from "@/lib/data/session";
import { decideRequest } from "@/lib/change-requests";
import { fail, translateDbError, type ActionResult } from "@/lib/action-result";
import { uuid } from "./helpers";

const decideSchema = z.object({
  id: uuid,
  decision: z.enum(["APPROVED", "REJECTED"]),
  reply: z.string().trim().max(500, "Resposta muito longa (até 500 caracteres).").optional().transform((v) => (v ? v : null)),
});

const amountSchema = z.string().optional().transform((v) => (v ? Number(v.replace(/\./g, "").replace(",", ".")) : undefined));

/** Web door into decideRequest: approving applies the request to the party (see src/lib/change-requests.ts). */
export async function decideChangeRequest(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = decideSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Verifique os campos.");
  const amount = amountSchema.parse(formData.get("amount") ? String(formData.get("amount")) : undefined);
  const [profile, org] = await Promise.all([requireProfile(), getOrganization()]);
  const supabase = await createClient();
  let eventId: string;
  try {
    ({ eventId } = await decideRequest({ supabase, org, userId: profile.id }, parsed.data.id, { approve: parsed.data.decision === "APPROVED", reply: parsed.data.reply, amount }));
  } catch (e) {
    return fail(e instanceof Error && !("code" in e) ? e.message : translateDbError(e as { message: string }));
  }

  revalidatePath("/solicitacoes");
  revalidatePath(`/eventos/${eventId}`, "layout");
  revalidatePath("/notificacoes");
  revalidatePath("/home");
  return { ok: true, message: parsed.data.decision === "APPROVED" ? "Pedido aprovado e aplicado na festa." : "Pedido recusado." };
}
