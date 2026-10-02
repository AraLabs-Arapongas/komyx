"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOwner, getBilling } from "@/lib/data/session";
import { fail, translateDbError, type ActionResult } from "@/lib/action-result";
import { toDateKey } from "@/lib/utils";

const DATA_RETENTION_DAYS = 90;

const cancelSchema = z.object({
  reason: z.string().trim().max(200).optional().transform((v) => v || null),
  confirm: z.literal("CANCELAR"),
});

/**
 * Owner cancels the Festeja subscription. Access continues until the end of the paid period
 * (billing due date, or 7 days when there is none); after that the app shows /cancelada with "Reativar".
 */
export async function cancelSubscription(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = cancelSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Digite CANCELAR para confirmar.", { confirm: "Digite CANCELAR" });
  const profile = await requireOwner();
  const billing = await getBilling(profile);
  const today = toDateKey(new Date());
  const fallback = toDateKey(new Date(Date.now() + 7 * 86_400_000));
  const accessUntil = billing?.due_at && billing.due_at > today ? billing.due_at : fallback;
  const admin = createAdminClient();
  const { error } = await admin
    .from("organizations")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString(), cancel_reason: parsed.data.reason, access_until: accessUntil })
    .eq("id", profile.organization_id);
  if (error) return fail(translateDbError(error));
  revalidatePath("/", "layout");
  return { ok: true, message: `Assinatura cancelada. Você ainda tem acesso até ${accessUntil.split("-").reverse().join("/")}; os dados ficam guardados por ${DATA_RETENTION_DAYS} dias depois disso.` };
}

/** Owner reactivates: same data, same page, same links. */
export async function reactivateSubscription() {
  const profile = await requireOwner();
  const admin = createAdminClient();
  const { data: org } = await admin.from("organizations").select("status").eq("id", profile.organization_id).single();
  if (org?.status !== "cancelled") redirect("/home");
  await admin.from("organizations").update({ status: "active", cancelled_at: null, cancel_reason: null, access_until: null }).eq("id", profile.organization_id);
  revalidatePath("/", "layout");
  redirect("/conta?reativada=1#assinatura");
}

