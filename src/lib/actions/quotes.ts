"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data/session";
import { fail, translateDbError, type ActionResult } from "@/lib/action-result";
import { moneySchema, optionalText, uuid } from "./helpers";

function revalidateQuote(eventId: string) {
  revalidatePath(`/eventos/${eventId}`);
  revalidatePath(`/eventos/${eventId}/orcamento`);
  revalidatePath("/home");
}

/** Creates a draft quote for the event, pre-filled from the package + estimated participants. */
export async function createQuote(eventId: string): Promise<ActionResult<{ id: string }>> {
  const idp = uuid.safeParse(eventId);
  if (!idp.success) return fail("Evento inválido.");
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: event, error: evErr } = await supabase
    .from("events")
    .select("id, organization_id, package_id, estimated_participants, packages(id, name, base_price, included_participants, additional_participant_price)")
    .eq("id", idp.data)
    .single();
  if (evErr || !event) return fail("Evento não encontrado.");

  const participants = event.estimated_participants ?? 0;
  const { data: quote, error } = await supabase
    .from("quotes")
    .insert({ organization_id: event.organization_id, event_id: event.id, package_id: event.package_id, participants, created_by: profile.id })
    .select("id")
    .single();
  if (error || !quote) return fail(translateDbError(error));

  const pkg = event.packages;
  if (pkg) {
    const items: { organization_id: string; quote_id: string; kind: "PACKAGE" | "EXTRA_PARTICIPANTS"; description: string; quantity: number; unit_price: number; sort_order: number }[] = [
      { organization_id: event.organization_id, quote_id: quote.id, kind: "PACKAGE", description: pkg.name, quantity: 1, unit_price: Number(pkg.base_price), sort_order: 0 },
    ];
    const extra = Math.max(participants - pkg.included_participants, 0);
    if (extra > 0 && Number(pkg.additional_participant_price) > 0) {
      items.push({ organization_id: event.organization_id, quote_id: quote.id, kind: "EXTRA_PARTICIPANTS", description: `Participantes adicionais (${extra})`, quantity: extra, unit_price: Number(pkg.additional_participant_price), sort_order: 1 });
    }
    await supabase.from("quote_items").insert(items);
  }

  revalidateQuote(event.id);
  return { ok: true, data: { id: quote.id } };
}

export async function createQuoteAndGo(formData: FormData) {
  const eventId = String(formData.get("event_id") ?? "");
  const res = await createQuote(eventId);
  if (res.ok) redirect(`/eventos/${eventId}/orcamento?quote=${res.data!.id}`);
  redirect(`/eventos/${eventId}?error=${encodeURIComponent(res.error)}`);
}

const addItemSchema = z.object({
  quote_id: uuid,
  event_id: uuid,
  kind: z.enum(["PACKAGE", "ADDON", "EXTRA_PARTICIPANTS", "CUSTOM"]).default("CUSTOM"),
  addon_id: z.string().optional().transform((v) => (v ? v : null)),
  description: z.string().trim().min(1, "Descrição obrigatória"),
  quantity: z.union([z.string(), z.number()]).transform((v) => Number(String(v).replace(",", "."))).refine((v) => v > 0, "Quantidade inválida"),
  unit_price: moneySchema,
});

export async function addQuoteItem(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = addItemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Verifique os campos.", Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
  const d = parsed.data;
  const profile = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("quote_items").insert({
    organization_id: profile.organization_id,
    quote_id: d.quote_id,
    kind: d.kind,
    addon_id: d.addon_id,
    description: d.description,
    quantity: d.quantity,
    unit_price: d.unit_price,
    sort_order: 10,
  });
  if (error) return fail(translateDbError(error));
  revalidateQuote(d.event_id);
  return { ok: true };
}

/** Adds an addon from the org catalog to the quote with its current price. */
export async function addAddonToQuote(formData: FormData) {
  const quoteId = String(formData.get("quote_id"));
  const eventId = String(formData.get("event_id"));
  const addonId = String(formData.get("addon_id"));
  const qty = Math.max(Number(formData.get("quantity") ?? 1) || 1, 1);
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: addon } = await supabase.from("package_addons").select("id, name, price").eq("id", addonId).single();
  if (addon) {
    await supabase.from("quote_items").insert({
      organization_id: profile.organization_id,
      quote_id: quoteId,
      kind: "ADDON",
      addon_id: addon.id,
      description: addon.name,
      quantity: qty,
      unit_price: Number(addon.price),
      sort_order: 5,
    });
  }
  revalidateQuote(eventId);
}

export async function removeQuoteItem(formData: FormData) {
  const id = String(formData.get("id"));
  const eventId = String(formData.get("event_id"));
  const supabase = await createClient();
  await supabase.from("quote_items").delete().eq("id", id);
  revalidateQuote(eventId);
}

const discountSchema = z.object({
  quote_id: uuid,
  event_id: uuid,
  discount_type: z.enum(["AMOUNT", "PERCENT"]),
  discount_value: moneySchema,
  notes: optionalText,
});

export async function updateQuoteDiscount(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = discountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Verifique o desconto.");
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("quotes")
    .update({ discount_type: d.discount_type, discount_value: d.discount_value, notes: d.notes })
    .eq("id", d.quote_id);
  if (error) return fail(translateDbError(error));
  revalidateQuote(d.event_id);
  return { ok: true, message: "Desconto atualizado." };
}

const quoteStatusSchema = z.object({ quote_id: uuid, event_id: uuid, status: z.enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED"]) });

/**
 * Accepting a quote also confirms the event (same record) when it is a pre-reservation.
 */
export async function changeQuoteStatus(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = quoteStatusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Ação inválida.");
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("quotes").update({ status: d.status }).eq("id", d.quote_id);
  if (error) return fail(translateDbError(error));

  if (d.status === "ACCEPTED") {
    const { data: ev } = await supabase.from("events").select("status").eq("id", d.event_id).single();
    if (ev?.status === "PRE_RESERVED" || ev?.status === "EXPIRED") {
      const { error: evErr } = await supabase.from("events").update({ status: "CONFIRMED", expires_at: null }).eq("id", d.event_id);
      if (evErr) return fail(`Orçamento aceito, mas não foi possível confirmar o evento: ${translateDbError(evErr)}`);
    }
    revalidatePath("/agenda");
  }
  revalidateQuote(d.event_id);
  return { ok: true, message: "Orçamento atualizado." };
}

/** Ensures there is an active QUOTE public link for the event; returns its token. */
export async function ensureQuoteLink(eventId: string) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("public_links")
    .select("token")
    .eq("event_id", eventId)
    .eq("type", "QUOTE")
    .eq("active", true)
    .maybeSingle();
  if (existing) return existing.token;
  const { data } = await supabase
    .from("public_links")
    .insert({ organization_id: profile.organization_id, event_id: eventId, type: "QUOTE", created_by: profile.id })
    .select("token")
    .single();
  return data?.token ?? null;
}
