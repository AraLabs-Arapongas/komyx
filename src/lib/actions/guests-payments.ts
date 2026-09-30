"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data/session";
import { fail, translateDbError, type ActionResult } from "@/lib/action-result";
import { dateSchema, moneySchema, optionalText, uuid, zodFieldErrors } from "./helpers";

function revalidateEvent(eventId: string) {
  revalidatePath(`/eventos/${eventId}`);
  revalidatePath("/home");
}

const guestSchema = z.object({
  event_id: uuid,
  name: z.string().trim().min(1, "Informe o nome"),
  participants: z.string().transform(Number).refine((v) => Number.isInteger(v) && v >= 1, "Mínimo 1"),
  notes: optionalText,
});

export async function addGuest(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = guestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Verifique os campos.", zodFieldErrors(parsed.error));
  const profile = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("guests").insert({ ...parsed.data, organization_id: profile.organization_id, source: "MANUAL" });
  if (error) return fail(translateDbError(error));
  revalidateEvent(parsed.data.event_id);
  return { ok: true };
}

export async function removeGuest(formData: FormData) {
  const id = String(formData.get("id"));
  const eventId = String(formData.get("event_id"));
  const supabase = await createClient();
  await supabase.from("guests").delete().eq("id", id);
  revalidateEvent(eventId);
}

const paymentSchema = z.object({
  event_id: uuid,
  amount: moneySchema.refine((v) => v > 0, "Informe um valor maior que zero"),
  paid_at: dateSchema,
  method: z.enum(["PIX", "CASH", "CARD", "TRANSFER", "OTHER"]),
  notes: optionalText,
});

export async function addPayment(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = paymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Verifique os campos.", zodFieldErrors(parsed.error));
  const profile = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("payments").insert({ ...parsed.data, organization_id: profile.organization_id, created_by: profile.id });
  if (error) return fail(translateDbError(error));
  revalidateEvent(parsed.data.event_id);
  return { ok: true, message: "Pagamento registrado." };
}

export async function removePayment(formData: FormData) {
  const id = String(formData.get("id"));
  const eventId = String(formData.get("event_id"));
  const supabase = await createClient();
  await supabase.from("payments").delete().eq("id", id);
  revalidateEvent(eventId);
}

/** Ensures an active guest-confirmation link exists for the event. */
export async function ensureGuestLink(formData: FormData) {
  const eventId = String(formData.get("event_id"));
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("public_links")
    .select("id")
    .eq("event_id", eventId)
    .eq("type", "GUEST_CONFIRM")
    .eq("active", true)
    .maybeSingle();
  if (!existing) {
    await supabase.from("public_links").insert({ organization_id: profile.organization_id, event_id: eventId, type: "GUEST_CONFIRM", created_by: profile.id });
  }
  revalidateEvent(eventId);
}

export async function revokePublicLink(formData: FormData) {
  const id = String(formData.get("id"));
  const eventId = String(formData.get("event_id"));
  const supabase = await createClient();
  await supabase.from("public_links").update({ active: false }).eq("id", id);
  revalidateEvent(eventId);
}
