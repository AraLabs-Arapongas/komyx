"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data/session";
import { fail, translateDbError, type ActionResult } from "@/lib/action-result";
import { dateSchema, moneySchema, optionalText, uuid, zodFieldErrors } from "./helpers";
import { toDateKey } from "@/lib/utils";

function revalidateEvent(eventId: string) {
  revalidatePath(`/eventos/${eventId}`);
  revalidatePath("/home");
}

const count = z.string().optional().transform((v) => Number(v || 0)).refine((v) => Number.isInteger(v) && v >= 0, "Inválido");
const guestSchema = z
  .object({
    event_id: uuid,
    name: z.string().trim().min(1, "Informe o nome"),
    adults: count,
    children: count,
    notes: optionalText,
  })
  .refine((d) => d.adults + d.children >= 1, { message: "Informe ao menos 1 pessoa", path: ["adults"] });

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

/** One-click "parcela recebida": registers a payment for the installment's remaining amount. */
export async function confirmInstallment(formData: FormData) {
  const parsed = paymentSchema.safeParse({
    event_id: formData.get("event_id"),
    amount: formData.get("amount"),
    paid_at: formData.get("paid_at") || toDateKey(new Date()),
    method: formData.get("method") || "PIX",
    notes: formData.get("notes") || "",
  });
  if (!parsed.success) return;
  const profile = await requireProfile();
  const supabase = await createClient();
  await supabase.from("payments").insert({ ...parsed.data, organization_id: profile.organization_id, created_by: profile.id });
  revalidateEvent(parsed.data.event_id);
}

export async function removePayment(formData: FormData) {
  const id = String(formData.get("id"));
  const eventId = String(formData.get("event_id"));
  const supabase = await createClient();
  await supabase.from("payments").delete().eq("id", id);
  revalidateEvent(eventId);
}

type LinkType = "GUEST_CONFIRM" | "QUOTE" | "INVITE_EDIT" | "CHECKIN" | "RESERVATION";

/** Ensures an active public link of the given type exists for the event. */
export async function ensureEventLink(formData: FormData) {
  const eventId = String(formData.get("event_id"));
  const type = String(formData.get("type") ?? "GUEST_CONFIRM") as LinkType;
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("public_links")
    .select("id")
    .eq("event_id", eventId)
    .eq("type", type)
    .eq("active", true)
    .maybeSingle();
  if (!existing) {
    await supabase.from("public_links").insert({ organization_id: profile.organization_id, event_id: eventId, type, created_by: profile.id });
  }
  revalidateEvent(eventId);
}

/** Back-compat alias used by the guest section. */
export async function ensureGuestLink(formData: FormData) {
  formData.set("type", "GUEST_CONFIRM");
  return ensureEventLink(formData);
}

const checkinSchema = z.object({
  id: uuid,
  event_id: uuid,
  checked_in_adults: count,
  checked_in_children: count,
});

/** Staff check-in from the event page (same rules as the door page). */
export async function checkInGuest(formData: FormData) {
  const parsed = checkinSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const d = parsed.data;
  const supabase = await createClient();
  const arrived = d.checked_in_adults + d.checked_in_children > 0;
  await supabase.from("guests").update({ checked_in_adults: d.checked_in_adults, checked_in_children: d.checked_in_children, checked_in_at: arrived ? new Date().toISOString() : null }).eq("id", d.id);
  revalidateEvent(d.event_id);
}

const extraSchema = z.object({
  event_id: uuid,
  addon_id: z.string().optional().transform((v) => (v ? v : null)),
  description: z.string().trim().min(1, "Informe o item"),
  quantity: z.string().transform((v) => Number(String(v).replace(",", "."))).refine((v) => v > 0, "Quantidade inválida"),
  unit_price: moneySchema,
});

/** On-site extra order registered by staff. */
export async function addEventExtra(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = extraSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Verifique os campos.", zodFieldErrors(parsed.error));
  const profile = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("event_extras").insert({ ...parsed.data, organization_id: profile.organization_id, source: "STAFF", created_by: profile.id });
  if (error) return fail(translateDbError(error));
  revalidateEvent(parsed.data.event_id);
  return { ok: true };
}

export async function removeEventExtra(formData: FormData) {
  const id = String(formData.get("id"));
  const eventId = String(formData.get("event_id"));
  const supabase = await createClient();
  await supabase.from("event_extras").delete().eq("id", id);
  revalidateEvent(eventId);
}

export async function revokePublicLink(formData: FormData) {
  const id = String(formData.get("id"));
  const eventId = String(formData.get("event_id"));
  const supabase = await createClient();
  await supabase.from("public_links").update({ active: false }).eq("id", id);
  revalidateEvent(eventId);
}
