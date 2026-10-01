"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getOrganization, requireProfile } from "@/lib/data/session";
import { fail, translateDbError, type ActionResult } from "@/lib/action-result";
import { addHours, localToIso } from "@/lib/utils";
import { dateSchema, formToObject, optionalText, phoneSchema, timeSchema, uuid, zodFieldErrors, UUID_RE } from "./helpers";
import { upsertCustomerByPhone } from "./customers";
import { buildQuoteLines } from "@/lib/pricing";

const intOrNull = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? Number(v) : null))
  .refine((v) => v === null || (Number.isInteger(v) && v >= 0), "Número inválido");

const uuidOrNull = z.string().optional().transform((v) => (v ? v : null)).refine((v) => v === null || UUID_RE.test(v), "Inválido");

const preReservationSchema = z.object({
  customer_id: uuidOrNull,
  customer_name: z.string().trim().optional().default(""),
  whatsapp: z.string().optional().default(""),
  title: optionalText,
  date: dateSchema,
  start_time: timeSchema,
  end_time: timeSchema,
  adults: intOrNull,
  children: intOrNull,
  package_id: uuidOrNull,
  celebrant_name: optionalText,
  celebrant_age: intOrNull,
  celebrant_birth_date: z.string().optional().transform((v) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null)),
  source: optionalText,
  notes: optionalText,
  status: z.enum(["PRE_RESERVED", "CONFIRMED"]).default("PRE_RESERVED"),
  request_id: uuidOrNull,
  force_same_day: z.string().optional().transform((v) => v === "on" || v === "1"),
});

/**
 * Buffets usually host one event per day. Staff is blocked; the owner can confirm.
 * Returns an ActionResult failure when the rule applies, otherwise null.
 */
async function checkSameDay(orgOneEventPerDay: boolean, role: "owner" | "staff", date: string, force: boolean, excludeId?: string): Promise<ActionResult | null> {
  if (!orgOneEventPerDay) return null;
  const supabase = await createClient();
  const dayStart = localToIso(date, "00:00");
  const dayEnd = new Date(new Date(dayStart).getTime() + 86_400_000).toISOString();
  let q = supabase.from("events").select("id, title, status, expires_at, customers(name)").gte("starts_at", dayStart).lt("starts_at", dayEnd).in("status", ["CONFIRMED", "PRE_RESERVED"]);
  if (excludeId) q = q.neq("id", excludeId);
  const { data } = await q;
  const blocking = (data ?? []).filter((e) => e.status === "CONFIRMED" || (e.expires_at && new Date(e.expires_at) > new Date()));
  if (blocking.length === 0) return null;
  const other = blocking[0];
  const label = other.title?.trim() || (other.customers ? `Festa de ${other.customers.name}` : "outro evento");
  if (role !== "owner") return fail(`Já existe evento neste dia (${label}). O buffet faz um evento por dia; peça à proprietária para liberar.`, { date: "Dia já ocupado" });
  if (!force) return fail(`Já existe evento neste dia (${label}). Marque "sei que já tem evento neste dia" para criar mesmo assim.`, { same_day: label });
  return null;
}

function revalidateEvents(id?: string) {
  revalidatePath("/home");
  revalidatePath("/agenda");
  revalidatePath("/eventos");
  if (id) revalidatePath(`/eventos/${id}`);
}

export async function createEvent(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = preReservationSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fail("Verifique os campos.", zodFieldErrors(parsed.error));
  const d = parsed.data;

  if (d.end_time <= d.start_time) return fail("Verifique os horários.", { end_time: "O fim deve ser maior que o início." });

  const [profile, org] = await Promise.all([requireProfile(), getOrganization()]);
  const supabase = await createClient();

  const sameDay = await checkSameDay(org.one_event_per_day, profile.role, d.date, d.force_same_day);
  if (sameDay) return sameDay;

  let customerId = d.customer_id;
  if (!customerId) {
    if (d.customer_name.length < 2) return fail("Informe o responsável.", { customer_name: "Informe o nome do responsável" });
    const phone = phoneSchema.safeParse(d.whatsapp);
    if (!phone.success) return fail("Verifique o WhatsApp.", { whatsapp: "WhatsApp inválido. Use DDD + número." });
    const res = await upsertCustomerByPhone(org.id, d.customer_name, phone.data, d.source);
    if (res.error || !res.id) return fail(translateDbError(res.error));
    customerId = res.id;
  }

  const starts_at = localToIso(d.date, d.start_time);
  const ends_at = localToIso(d.date, d.end_time);
  const expires_at = d.status === "PRE_RESERVED" ? addHours(new Date(), org.pre_reservation_validity_hours).toISOString() : null;

  const { data, error } = await supabase
    .from("events")
    .insert({
      organization_id: org.id,
      customer_id: customerId,
      title: d.title,
      starts_at,
      ends_at,
      status: d.status,
      package_id: d.package_id,
      adults: d.adults,
      children: d.children,
      celebrant_name: d.celebrant_name,
      celebrant_age: d.celebrant_age,
      notes: d.notes,
      expires_at,
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (error) return fail(translateDbError(error));

  if (d.celebrant_name && d.celebrant_birth_date) {
    await supabase.from("celebrants").insert({ organization_id: org.id, customer_id: customerId, event_id: data.id, name: d.celebrant_name, birth_date: d.celebrant_birth_date });
  }

  if (d.request_id) {
    const { data: req } = await supabase.from("public_requests").select("package_id, addons, adults, children, source").eq("id", d.request_id).maybeSingle();
    await supabase.from("public_requests").update({ status: "CONVERTED", event_id: data.id }).eq("id", d.request_id);
    if (req?.source) await supabase.from("customers").update({ source: req.source }).eq("id", customerId).is("source", null);
    // Self-service request: build the quote from what the client chose.
    if (req?.package_id || (Array.isArray(req?.addons) && req.addons.length > 0)) {
      await createQuoteFromRequest(data.id, org.id, profile.id, d.adults ?? req?.adults ?? 0, d.children ?? req?.children ?? 0, req.package_id ?? d.package_id, req.addons);
    }
    revalidatePath("/solicitacoes");
  }

  revalidateEvents(data.id);
  redirect(`/eventos/${data.id}?created=1`);
}

async function createQuoteFromRequest(eventId: string, orgId: string, userId: string, adults: number, children: number, packageId: string | null, addons: unknown) {
  const supabase = await createClient();
  const { data: pkg } = packageId
    ? await supabase.from("packages").select("id, name, base_price, included_adults, included_children, extra_adult_price, extra_child_price").eq("id", packageId).maybeSingle()
    : { data: null };
  const chosen = Array.isArray(addons) ? (addons as { addon_id?: string; quantity?: number }[]) : [];
  const ids = chosen.map((a) => a.addon_id).filter((v): v is string => typeof v === "string");
  const { data: addonRows } = ids.length ? await supabase.from("package_addons").select("id, name, price").in("id", ids) : { data: [] };
  const addonLines = (addonRows ?? []).map((addon) => ({ addon, quantity: Math.max(Number(chosen.find((c) => c.addon_id === addon.id)?.quantity ?? 1), 1) }));
  const { data: quote } = await supabase
    .from("quotes")
    .insert({ organization_id: orgId, event_id: eventId, package_id: pkg?.id ?? null, adults, children, created_by: userId })
    .select("id")
    .single();
  if (!quote) return;
  const lines = buildQuoteLines(pkg, adults, children, addonLines);
  if (lines.length) await supabase.from("quote_items").insert(lines.map((l) => ({ ...l, organization_id: orgId, quote_id: quote.id })));
}

const updateSchema = z.object({
  id: uuid,
  title: optionalText,
  date: dateSchema,
  start_time: timeSchema,
  end_time: timeSchema,
  adults: intOrNull,
  children: intOrNull,
  package_id: uuidOrNull,
  celebrant_name: optionalText,
  celebrant_age: intOrNull,
  space: z.string().trim().optional().default(""),
  notes: optionalText,
  force_same_day: z.string().optional().transform((v) => v === "on" || v === "1"),
});

export async function updateEvent(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = updateSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fail("Verifique os campos.", zodFieldErrors(parsed.error));
  const d = parsed.data;
  if (d.end_time <= d.start_time) return fail("Verifique os horários.", { end_time: "O fim deve ser maior que o início." });

  const [profile, org] = await Promise.all([requireProfile(), getOrganization()]);
  const sameDay = await checkSameDay(org.one_event_per_day, profile.role, d.date, d.force_same_day, d.id);
  if (sameDay) return sameDay;

  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .update({
      title: d.title,
      starts_at: localToIso(d.date, d.start_time),
      ends_at: localToIso(d.date, d.end_time),
      adults: d.adults,
      children: d.children,
      package_id: d.package_id,
      celebrant_name: d.celebrant_name,
      celebrant_age: d.celebrant_age,
      space: d.space,
      notes: d.notes,
    })
    .eq("id", d.id);
  if (error) return fail(translateDbError(error));
  revalidateEvents(d.id);
  redirect(`/eventos/${d.id}`);
}

const statusSchema = z.object({ id: uuid, status: z.enum(["PRE_RESERVED", "CONFIRMED", "DONE", "CANCELLED"]) });

/**
 * Status transitions happen on the same event row (never duplicate).
 * Confirming clears the expiration; re-opening as pre-reservation sets a new one.
 */
export async function changeEventStatus(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = statusSchema.safeParse({ id: formData.get("id"), status: formData.get("status") });
  if (!parsed.success) return fail("Ação inválida.");
  const { id, status } = parsed.data;
  const org = await getOrganization();
  const supabase = await createClient();

  const patch: { status: typeof status; expires_at?: string | null } = { status };
  if (status === "CONFIRMED") patch.expires_at = null;
  if (status === "PRE_RESERVED") patch.expires_at = addHours(new Date(), org.pre_reservation_validity_hours).toISOString();

  const { error } = await supabase.from("events").update(patch).eq("id", id);
  if (error) return fail(translateDbError(error));
  revalidateEvents(id);
  return { ok: true, message: "Status atualizado." };
}

export async function extendPreReservation(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return fail("Evento inválido.");
  const org = await getOrganization();
  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .update({ status: "PRE_RESERVED", expires_at: addHours(new Date(), org.pre_reservation_validity_hours).toISOString() })
    .eq("id", id.data);
  if (error) return fail(translateDbError(error));
  revalidateEvents(id.data);
  return { ok: true, message: "Pré-reserva renovada." };
}

export async function expirePreReservations() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("expire_pre_reservations");
  return data ?? 0;
}

const inviteSchema = z.object({
  id: uuid,
  invite_title: optionalText,
  invite_message: optionalText,
});

/** Staff-side invitation edit (image handled by uploadInviteImage). */
export async function updateInvite(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = inviteSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fail("Verifique os campos.");
  const supabase = await createClient();
  const { error } = await supabase.from("events").update({ invite_title: parsed.data.invite_title, invite_message: parsed.data.invite_message, invite_updated_at: new Date().toISOString() }).eq("id", parsed.data.id);
  if (error) return fail(translateDbError(error));
  revalidateEvents(parsed.data.id);
  return { ok: true, message: "Convite atualizado." };
}

/**
 * Owner/staff matched the Pix deposit on the bank statement: registers the first installment
 * as a payment and confirms the event (same row, PRE_RESERVED -> CONFIRMED).
 */
export async function confirmDeposit(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return fail("Evento inválido.");
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: quote } = await supabase
    .from("quotes")
    .select("id, status, quote_installments(amount, sequence)")
    .eq("event_id", id.data)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const first = quote ? [...quote.quote_installments].sort((a, b) => a.sequence - b.sequence)[0] : null;
  const amountRaw = String(formData.get("amount") ?? "").replace(/\./g, "").replace(",", ".");
  const amount = amountRaw ? Number(amountRaw) : first ? Number(first.amount) : 0;
  if (!(amount > 0)) return fail("Informe o valor recebido.");

  const { error: payErr } = await supabase.from("payments").insert({
    organization_id: profile.organization_id,
    event_id: id.data,
    amount,
    method: "PIX",
    notes: "Sinal da reserva online (Pix conferido no extrato)",
    created_by: profile.id,
  });
  if (payErr) return fail(translateDbError(payErr));
  if (quote && quote.status !== "ACCEPTED") await supabase.from("quotes").update({ status: "ACCEPTED" }).eq("id", quote.id);
  const { error } = await supabase.from("events").update({ status: "CONFIRMED", expires_at: null }).eq("id", id.data);
  if (error) return fail(translateDbError(error));
  revalidateEvents(id.data);
  return { ok: true, message: "Sinal registrado e evento confirmado." };
}
