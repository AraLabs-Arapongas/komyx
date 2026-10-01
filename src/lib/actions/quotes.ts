"use server";

import { revalidatePath } from "next/cache";
import { ensureContract } from "./contracts";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data/session";
import { fail, translateDbError, type ActionResult } from "@/lib/action-result";
import { moneySchema, optionalText, uuid } from "./helpers";
import { buildQuoteLines } from "@/lib/pricing";

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
    .select("id, organization_id, package_id, adults, children, packages(id, name, base_price, included_adults, included_children, extra_adult_price, extra_child_price)")
    .eq("id", idp.data)
    .single();
  if (evErr || !event) return fail("Evento não encontrado.");

  const adults = event.adults ?? 0;
  const children = event.children ?? 0;
  const { data: quote, error } = await supabase
    .from("quotes")
    .insert({ organization_id: event.organization_id, event_id: event.id, package_id: event.package_id, adults, children, created_by: profile.id })
    .select("id")
    .single();
  if (error || !quote) return fail(translateDbError(error));

  const lines = buildQuoteLines(event.packages, adults, children, []);
  if (lines.length > 0) {
    await supabase.from("quote_items").insert(lines.map((l) => ({ ...l, organization_id: event.organization_id, quote_id: quote.id })));
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
    await ensureContract(d.event_id);
  }
  revalidateQuote(d.event_id);
  return { ok: true, message: d.status === "ACCEPTED" ? "Orçamento aceito. Contrato gerado a partir dele." : "Orçamento atualizado." };
}

/** Ensures there is an active QUOTE public link for the event; returns its token. */
/** Returns the short code of the public quote link (creates it when missing). */
export async function ensureQuoteLink(eventId: string) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("public_links")
    .select("short")
    .eq("event_id", eventId)
    .eq("type", "QUOTE")
    .eq("active", true)
    .maybeSingle();
  if (existing) return existing.short;
  const { data } = await supabase
    .from("public_links")
    .insert({ organization_id: profile.organization_id, event_id: eventId, type: "QUOTE", created_by: profile.id })
    .select("short")
    .single();
  return data?.short ?? null;
}

const installmentsSchema = z.object({ quote_id: uuid, event_id: uuid });

/** Replaces the quote payment plan with the submitted rows (label/percent/rule/days_before arrays). */
export async function updateQuoteInstallments(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const head = installmentsSchema.safeParse({ quote_id: formData.get("quote_id"), event_id: formData.get("event_id") });
  if (!head.success) return fail("Orçamento inválido.");
  const labels = formData.getAll("label").map(String);
  const percents = formData.getAll("percent").map((v) => Number(String(v).replace(",", ".")));
  const rules = formData.getAll("rule").map(String);
  const days = formData.getAll("days_before").map((v) => (String(v).trim() === "" ? null : Number(v)));
  const dates = formData.getAll("due_date").map((v) => (String(v).trim() === "" ? null : String(v)));
  if (labels.length === 0) return fail("Adicione ao menos uma parcela.");
  const sum = percents.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
  if (Math.abs(sum - 100) > 0.01) return fail(`Os percentuais devem somar 100% (atual: ${sum}%).`);
  const rows = labels.map((label, i) => ({
    label: label.trim() || `Parcela ${i + 1}`,
    percent: percents[i],
    rule: (["ON_ACCEPT", "DAYS_BEFORE_EVENT", "FIXED_DATE"].includes(rules[i]) ? rules[i] : "DAYS_BEFORE_EVENT") as "ON_ACCEPT" | "DAYS_BEFORE_EVENT" | "FIXED_DATE",
    days_before: rules[i] === "DAYS_BEFORE_EVENT" ? Math.max(days[i] ?? 0, 0) : null,
    due_date: rules[i] === "FIXED_DATE" ? dates[i] : null,
    sequence: i + 1,
  }));
  const profile = await requireProfile();
  const supabase = await createClient();
  const { error: delErr } = await supabase.from("quote_installments").delete().eq("quote_id", head.data.quote_id);
  if (delErr) return fail(translateDbError(delErr));
  const { error } = await supabase.from("quote_installments").insert(rows.map((r) => ({ ...r, organization_id: profile.organization_id, quote_id: head.data.quote_id })));
  if (error) return fail(translateDbError(error));
  revalidateQuote(head.data.event_id);
  return { ok: true, message: "Plano de pagamento atualizado." };
}

const participantsSchema = z.object({
  quote_id: uuid,
  event_id: uuid,
  adults: z.string().transform(Number).refine((v) => Number.isInteger(v) && v >= 0, "Inválido"),
  children: z.string().transform(Number).refine((v) => Number.isInteger(v) && v >= 0, "Inválido"),
});

/** Updates adults/children on the quote and rebuilds package + extra-participant lines (addons/custom kept). */
export async function updateQuoteParticipants(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = participantsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Verifique os campos.");
  const d = parsed.data;
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: quote } = await supabase.from("quotes").select("id, package_id, packages(id, name, base_price, included_adults, included_children, extra_adult_price, extra_child_price)").eq("id", d.quote_id).single();
  if (!quote) return fail("Orçamento não encontrado.");
  const { error: upErr } = await supabase.from("quotes").update({ adults: d.adults, children: d.children }).eq("id", d.quote_id);
  if (upErr) return fail(translateDbError(upErr));
  await supabase.from("quote_items").delete().eq("quote_id", d.quote_id).in("kind", ["PACKAGE", "EXTRA_PARTICIPANTS"]);
  const lines = buildQuoteLines(quote.packages, d.adults, d.children, []);
  if (lines.length > 0) await supabase.from("quote_items").insert(lines.map((l) => ({ ...l, organization_id: profile.organization_id, quote_id: d.quote_id })));
  revalidateQuote(d.event_id);
  return { ok: true, message: "Participantes atualizados." };
}
