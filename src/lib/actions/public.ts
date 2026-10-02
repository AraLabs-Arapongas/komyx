"use server";

import { revalidatePath } from "next/cache";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail, translateDbError, type ActionResult } from "@/lib/action-result";
import { dateSchema, optionalText, phoneSchema, zodFieldErrors, UUID_RE, uuid } from "./helpers";
import { buildQuoteLines, sumLines } from "@/lib/pricing";
import { localToIso, appUrl } from "@/lib/utils";
import { occasionLabel } from "@/lib/labels";
import { buildPixPayload } from "@/lib/pix";
import QRCode from "qrcode";

/**
 * Public actions run with the service role on the server. Every query is scoped by
 * the random token / slug and only the minimum data is written.
 */

const count = z.string().optional().transform((v) => Number(v || 0)).refine((v) => Number.isInteger(v) && v >= 0 && v <= 50, "Entre 0 e 50");

const guestConfirmSchema = z
  .object({
    token: z.string().min(20),
    name: z.string().trim().min(2, "Informe seu nome"),
    adults: count,
    children: count,
    notes: optionalText,
  })
  .refine((d) => d.adults + d.children >= 1, { message: "Informe ao menos 1 pessoa", path: ["adults"] });

export async function confirmGuest(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = guestConfirmSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Verifique os campos.", zodFieldErrors(parsed.error));
  const admin = createAdminClient();
  const { data: link } = await admin
    .from("public_links")
    .select("id, organization_id, event_id, expires_at, events(status)")
    .eq("token", parsed.data.token)
    .eq("type", "GUEST_CONFIRM")
    .eq("active", true)
    .maybeSingle();
  if (!link) return fail("Este link não está mais disponível.");
  if (link.expires_at && new Date(link.expires_at) < new Date()) return fail("Este link expirou.");
  if (link.events?.status === "CANCELLED") return fail("Este evento foi cancelado.");

  const { error } = await admin.from("guests").insert({
    organization_id: link.organization_id,
    event_id: link.event_id,
    name: parsed.data.name,
    adults: parsed.data.adults,
    children: parsed.data.children,
    notes: parsed.data.notes,
    source: "PUBLIC",
  });
  if (error) return fail(translateDbError(error));
  return { ok: true, message: "Presença confirmada. Obrigado!" };
}

const optionalCount = z.string().optional().transform((v) => (v && v.trim() !== "" ? Number(v) : null)).refine((v) => v === null || (Number.isInteger(v) && v >= 0 && v <= 2000), "Inválido");

const requestSchema = z.object({
  slug: z.string().min(1),
  name: z.string().trim().min(2, "Informe seu nome"),
  whatsapp: phoneSchema,
  desired_date: z.union([dateSchema, z.literal("")]).optional().transform((v) => v || null),
  desired_time: z.string().optional().transform((v) => (v && /^\d{2}:\d{2}$/.test(v) ? v : null)),
  adults: optionalCount,
  children: optionalCount,
  source: z.string().optional().transform((v) => (v && v.trim() ? v.trim().slice(0, 40) : null)),
  occasion: z.enum(["BIRTHDAY", "GENDER_REVEAL", "CORPORATE", "WEDDING", "OTHER"]).optional().or(z.literal("")).transform((v) => v || null),
  celebrant_name: optionalText,
  celebrant_birth_date: z.union([dateSchema, z.literal("")]).optional().transform((v) => v || null),
  package_id: z.string().optional().transform((v) => (v && UUID_RE.test(v) ? v : null)),
  theme_id: z.string().optional().transform((v) => (v && UUID_RE.test(v) ? v : null)),
  addons: z.string().optional().transform((v) => {
    if (!v) return null;
    try {
      const arr = JSON.parse(v);
      if (!Array.isArray(arr)) return null;
      return arr
        .filter((a) => a && typeof a.addon_id === "string" && Number(a.quantity) > 0)
        .map((a) => ({ addon_id: String(a.addon_id), quantity: Math.min(Math.round(Number(a.quantity)), 500) }));
    } catch {
      return null;
    }
  }),
  message: optionalText,
  mode: z.enum(["lead", "reserve"]).optional().default("lead"),
});

export type PublicSubmitResult = {
  estimated_total: number | null;
  reservation?: {
    event_id: string;
    expires_at: string;
    starts_at: string;
    ends_at: string;
    quote_token: string | null;
    deposit_amount: number | null;
    deposit_label: string | null;
    deposit_hours: number;
    pix_key: string | null;
    pix_payload: string | null;
    pix_qr: string | null; // data URI (SVG)
    pix_txid: string; // reservation code shown on the payer's receipt
    reservation_url: string; // permanent client page (/r/[token])
    whatsapp: string | null;
    org_name: string;
  };
};

/**
 * Interest form and self-service quote both land here. When a package or addons are
 * chosen, the estimated total is recomputed server-side from current prices.
 */
export async function submitPublicRequest(_prev: ActionResult<PublicSubmitResult> | undefined, formData: FormData): Promise<ActionResult<PublicSubmitResult>> {
  const parsed = requestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Verifique os campos.", zodFieldErrors(parsed.error));
  const d = parsed.data;
  const isBirthday = !d.occasion || d.occasion === "BIRTHDAY";
  const admin = createAdminClient();
  const { data: org } = await admin.from("organizations").select("id, name, legal_name, city, whatsapp, pix_key, self_booking_enabled, one_event_per_day, pre_reservation_validity_hours, default_event_duration_minutes, status").eq("slug", d.slug).maybeSingle();
  if (!org || org.status !== "active") return fail("Buffet não encontrado.");

  let estimated_total: number | null = null;
  let addonsSnapshot: { addon_id: string; name: string; price: number; quantity: number }[] | null = null;
  let pkg: { id: string; name: string; base_price: number; included_adults: number; included_children: number; extra_adult_price: number; extra_child_price: number } | null = null;
  if (d.package_id) {
    const { data } = await admin.from("packages").select("id, name, base_price, included_adults, included_children, extra_adult_price, extra_child_price").eq("id", d.package_id).eq("organization_id", org.id).eq("active", true).maybeSingle();
    pkg = data;
  }
  if (d.addons && d.addons.length) {
    const { data: rows } = await admin.from("package_addons").select("id, name, price").eq("organization_id", org.id).eq("active", true).in("id", d.addons.map((a) => a.addon_id));
    addonsSnapshot = (rows ?? []).map((r) => ({ addon_id: r.id, name: r.name, price: Number(r.price), quantity: d.addons!.find((a) => a.addon_id === r.id)?.quantity ?? 1 }));
  }
  if (pkg || (addonsSnapshot && addonsSnapshot.length)) {
    const lines = buildQuoteLines(pkg, d.adults ?? 0, d.children ?? 0, (addonsSnapshot ?? []).map((a) => ({ addon: { id: a.addon_id, name: a.name, price: a.price }, quantity: a.quantity })));
    estimated_total = sumLines(lines);
  }

  const participants = d.adults === null && d.children === null ? null : (d.adults ?? 0) + (d.children ?? 0);
  const { data: request, error } = await admin.from("public_requests").insert({
    organization_id: org.id,
    name: d.name,
    whatsapp: d.whatsapp,
    desired_date: d.desired_date,
    desired_time: d.desired_time,
    participants,
    adults: d.adults,
    children: d.children,
    source: d.source,
    occasion: d.occasion,
    celebrant_name: isBirthday ? d.celebrant_name : null,
    celebrant_birth_date: isBirthday ? d.celebrant_birth_date : null,
    package_id: pkg?.id ?? null,
    theme_id: d.theme_id,
    addons: addonsSnapshot,
    estimated_total,
    message: d.message,
  }).select("id").single();
  if (error || !request) return fail(translateDbError(error));

  // No package means no price, so there is nothing to hold with a Pix deposit: it stays a plain request.
  if (d.mode !== "reserve" || !pkg) {
    return { ok: true, data: { estimated_total }, message: estimated_total !== null ? "Recebemos seu orçamento! Em breve confirmamos a disponibilidade da data pelo WhatsApp." : "Recebemos sua solicitação! Em breve entraremos em contato pelo WhatsApp." };
  }

  // ---- Autonomous reservation: hold the date now, no staff involved ----
  if (!org.self_booking_enabled) return fail("Este buffet confirma datas pelo WhatsApp. Envie o pedido e respondemos em breve.");
  if (!d.desired_date || !d.desired_time) return fail("Escolha dia e horário para reservar.", { desired_date: "Obrigatório" });
  const starts_at = localToIso(d.desired_date, d.desired_time);
  const ends_at = new Date(new Date(starts_at).getTime() + org.default_event_duration_minutes * 60_000).toISOString();
  if (new Date(starts_at) < new Date()) return fail("Escolha uma data futura.");

  if (org.one_event_per_day) {
    const { data: busy } = await admin.rpc("busy_days", { p_slug: d.slug, p_from: d.desired_date, p_to: d.desired_date });
    if (busy && busy.length) return fail("Este dia acabou de ser reservado por outra pessoa. Escolha outra data.", { desired_date: "Dia ocupado" });
  }

  const { data: existing } = await admin.from("customers").select("id").eq("organization_id", org.id).eq("whatsapp", d.whatsapp).maybeSingle();
  let customerId = existing?.id ?? null;
  if (!customerId) {
    const { data: c, error: cErr } = await admin.from("customers").insert({ organization_id: org.id, name: d.name, whatsapp: d.whatsapp, source: d.source }).select("id").single();
    if (cErr || !c) return fail(translateDbError(cErr));
    customerId = c.id;
  }

  const expires_at = new Date(Date.now() + org.pre_reservation_validity_hours * 3_600_000).toISOString();
  const { data: event, error: evErr } = await admin
    .from("events")
    .insert({
      organization_id: org.id,
      customer_id: customerId,
      title: isBirthday && d.celebrant_name ? `Aniversário de ${d.celebrant_name}` : d.occasion && d.occasion !== "BIRTHDAY" ? occasionLabel(d.occasion) : null,
      occasion: d.occasion,
      starts_at,
      ends_at,
      status: "PRE_RESERVED",
      expires_at,
      package_id: pkg?.id ?? null,
      theme_id: d.theme_id,
      adults: d.adults ?? 0,
      children: d.children ?? 0,
      celebrant_name: isBirthday ? d.celebrant_name : null,
      notes: `Reserva feita pelo cliente na página pública.${d.message ? ` Mensagem: ${d.message}` : ""}`,
      origin: "SELF_SERVICE",
    })
    .select("id")
    .single();
  if (evErr || !event) {
    if (evErr?.hint === "SCHEDULE_CONFLICT" || evErr?.message.includes("Horário indisponível")) return fail("Este horário acabou de ser reservado. Escolha outra data ou horário.", { desired_date: "Ocupado" });
    return fail(translateDbError(evErr));
  }

  if (d.celebrant_name && d.celebrant_birth_date) {
    await admin.from("celebrants").insert({ organization_id: org.id, customer_id: customerId, event_id: event.id, name: d.celebrant_name, birth_date: d.celebrant_birth_date });
  }

  // Quote + lines (installments are seeded by trigger from the org plan)
  let quoteToken: string | null = null;
  let deposit: { amount: number; label: string } | null = null;
  const lines = buildQuoteLines(pkg, d.adults ?? 0, d.children ?? 0, (addonsSnapshot ?? []).map((a) => ({ addon: { id: a.addon_id, name: a.name, price: a.price }, quantity: a.quantity })));
  const { data: quote } = await admin
    .from("quotes")
    .insert({ organization_id: org.id, event_id: event.id, package_id: pkg?.id ?? null, adults: d.adults ?? 0, children: d.children ?? 0, status: lines.length ? "SENT" : "DRAFT" })
    .select("id")
    .single();
  if (quote) {
    if (lines.length) await admin.from("quote_items").insert(lines.map((l) => ({ ...l, organization_id: org.id, quote_id: quote.id })));
    const { data: inst } = await admin.from("quote_installments").select("label, amount, rule").eq("quote_id", quote.id).order("sequence").limit(1);
    if (inst?.[0]) deposit = { amount: Number(inst[0].amount), label: inst[0].label };
    if (lines.length) {
      const { data: link } = await admin.from("public_links").insert({ organization_id: org.id, event_id: event.id, type: "QUOTE" }).select("token").single();
      quoteToken = link?.token ?? null;
    }
  }

  await admin.from("public_requests").update({ status: "CONVERTED", event_id: event.id }).eq("id", request.id);
  const { data: resLink } = await admin.from("public_links").insert({ organization_id: org.id, event_id: event.id, type: "RESERVATION" }).select("token").single();
  const reservationUrl = appUrl(`/r/${resLink?.token ?? ""}`);

  // Pix QR for the deposit. The txid (EMV field 62-05) shows up as "Identificador" on the payer's
  // receipt and bank statement, so the owner can match the deposit to this reservation.
  const pixTxid = `FESTA${event.id.replace(/-/g, "").slice(0, 10).toUpperCase()}`;
  await admin.from("events").update({ pix_txid: pixTxid }).eq("id", event.id);
  let pixPayload: string | null = null;
  let pixQr: string | null = null;
  if (org.pix_key) {
    pixPayload = buildPixPayload({
      key: org.pix_key,
      merchantName: org.legal_name || org.name,
      merchantCity: (org.city || "SAO PAULO").split("/")[0],
      amount: deposit?.amount ?? null,
      txid: pixTxid,
      description: `${pixTxid} sinal festa ${d.desired_date.split("-").reverse().join("/")}`,
    });
    try {
      const svg = await QRCode.toString(pixPayload, { type: "svg", margin: 1, width: 240, errorCorrectionLevel: "M" });
      pixQr = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    } catch {
      pixQr = null;
    }
  }

  return {
    ok: true,
    data: {
      estimated_total,
      reservation: {
        event_id: event.id, expires_at, starts_at, ends_at, quote_token: quoteToken,
        deposit_amount: deposit?.amount ?? null, deposit_label: deposit?.label ?? null, deposit_hours: org.pre_reservation_validity_hours,
        pix_key: org.pix_key, pix_payload: pixPayload, pix_qr: pixQr, pix_txid: pixTxid, reservation_url: reservationUrl, whatsapp: org.whatsapp, org_name: org.name,
      },
    },
    message: "Data reservada!",
  };
}

// ------------------------------------------------------------
// Invitation edit (customer-facing, by INVITE_EDIT token)
// ------------------------------------------------------------
async function eventByLink(token: string, type: "INVITE_EDIT" | "CHECKIN") {
  if (token.length < 20) return null;
  const admin = createAdminClient();
  const { data: link } = await admin
    .from("public_links")
    .select("id, organization_id, event_id, expires_at, events(id, status, organization_id)")
    .eq("token", token)
    .eq("type", type)
    .eq("active", true)
    .maybeSingle();
  if (!link || !link.events) return null;
  if (link.expires_at && new Date(link.expires_at) < new Date()) return null;
  if (link.events.status === "CANCELLED") return null;
  return { admin, link };
}

const inviteSchema = z.object({
  token: z.string().min(20),
  invite_title: optionalText,
  invite_message: optionalText,
});

export async function updateInviteByToken(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = inviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Verifique os campos.");
  const ctx = await eventByLink(parsed.data.token, "INVITE_EDIT");
  if (!ctx) return fail("Este link não está mais disponível.");

  const file = formData.get("image");
  const patch: { invite_title: string | null; invite_message: string | null; invite_updated_at: string; invite_image_url?: string } = {
    invite_title: parsed.data.invite_title,
    invite_message: parsed.data.invite_message,
    invite_updated_at: new Date().toISOString(),
  };
  if (file instanceof File && file.size > 0) {
    if (file.size > 8 * 1024 * 1024) return fail("Imagem muito grande (máx. 8MB).");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return fail("Use JPG, PNG ou WebP.");
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${ctx.link.organization_id}/invites/${ctx.link.event_id}-${Date.now()}.${ext}`;
    const { error: upErr } = await ctx.admin.storage.from("org-media").upload(path, file, { contentType: file.type, upsert: true });
    if (upErr) return fail(upErr.message);
    patch.invite_image_url = ctx.admin.storage.from("org-media").getPublicUrl(path).data.publicUrl;
  }
  const { error } = await ctx.admin.from("events").update(patch).eq("id", ctx.link.event_id);
  if (error) return fail(translateDbError(error));
  return { ok: true, message: "Convite salvo! Compartilhe o link de confirmação com os convidados." };
}

// ------------------------------------------------------------
// Door check-in (by CHECKIN token)
// ------------------------------------------------------------
const doorCheckinSchema = z.object({
  token: z.string().min(20),
  guest_id: uuid,
  checked_in_adults: count,
  checked_in_children: count,
});

export async function doorCheckIn(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = doorCheckinSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Dados inválidos.");
  const ctx = await eventByLink(parsed.data.token, "CHECKIN");
  if (!ctx) return fail("Este link não está mais disponível.");
  const d = parsed.data;
  const arrived = d.checked_in_adults + d.checked_in_children > 0;
  const { error } = await ctx.admin
    .from("guests")
    .update({ checked_in_adults: d.checked_in_adults, checked_in_children: d.checked_in_children, checked_in_at: arrived ? new Date().toISOString() : null })
    .eq("id", d.guest_id)
    .eq("event_id", ctx.link.event_id);
  if (error) return fail(translateDbError(error));
  return { ok: true };
}

const doorGuestSchema = z
  .object({
    token: z.string().min(20),
    name: z.string().trim().min(1, "Informe o nome"),
    adults: count,
    children: count,
  })
  .refine((d) => d.adults + d.children >= 1, { message: "Informe ao menos 1 pessoa", path: ["adults"] });

/** Extra guest that showed up without confirming: added and checked in at once. */
export async function doorAddGuest(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = doorGuestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Verifique os campos.", zodFieldErrors(parsed.error));
  const ctx = await eventByLink(parsed.data.token, "CHECKIN");
  if (!ctx) return fail("Este link não está mais disponível.");
  const d = parsed.data;
  const { error } = await ctx.admin.from("guests").insert({
    organization_id: ctx.link.organization_id,
    event_id: ctx.link.event_id,
    name: d.name,
    adults: d.adults,
    children: d.children,
    source: "DOOR",
    checked_in_adults: d.adults,
    checked_in_children: d.children,
    checked_in_at: new Date().toISOString(),
  });
  if (error) return fail(translateDbError(error));
  return { ok: true };
}

const doorExtraSchema = z.object({
  token: z.string().min(20),
  addon_id: z.string().optional().transform((v) => (v && UUID_RE.test(v) ? v : null)),
  description: z.string().trim().optional().default(""),
  quantity: z.string().optional().transform((v) => Number(String(v || "1").replace(",", "."))).refine((v) => v > 0 && v <= 999, "Quantidade inválida"),
  unit_price: z.string().optional().transform((v) => Number(String(v || "0").replace(",", "."))).refine((v) => v >= 0, "Valor inválido"),
});

/** Extra order made during the party (e.g. more drinks). Price comes from the catalog when an addon is chosen. */
export async function doorAddExtra(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = doorExtraSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Verifique os campos.", zodFieldErrors(parsed.error));
  const ctx = await eventByLink(parsed.data.token, "CHECKIN");
  if (!ctx) return fail("Este link não está mais disponível.");
  const d = parsed.data;
  let description = d.description;
  let unit_price = d.unit_price;
  if (d.addon_id) {
    const { data: addon } = await ctx.admin.from("package_addons").select("name, price").eq("id", d.addon_id).eq("organization_id", ctx.link.organization_id).maybeSingle();
    if (!addon) return fail("Adicional não encontrado.");
    description = addon.name;
    unit_price = Number(addon.price);
  }
  if (!description) return fail("Informe o item.", { description: "Informe o item" });
  const { error } = await ctx.admin.from("event_extras").insert({
    organization_id: ctx.link.organization_id,
    event_id: ctx.link.event_id,
    addon_id: d.addon_id,
    description,
    quantity: d.quantity,
    unit_price,
    source: "DOOR",
  });
  if (error) return fail(translateDbError(error));
  return { ok: true };
}

// ------------------------------------------------------------
// Contract acceptance (by contract token)
// ------------------------------------------------------------
const acceptSchema = z.object({
  token: z.string().min(20),
  accepted_name: z.string().trim().min(3, "Digite seu nome completo"),
  agree: z.literal("on", { message: "Marque que leu e concorda" }),
});

export async function acceptContract(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = acceptSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Verifique os campos.", zodFieldErrors(parsed.error));
  const admin = createAdminClient();
  const { data: c } = await admin.from("contracts").select("id, status").eq("token", parsed.data.token).maybeSingle();
  if (!c) return fail("Contrato não encontrado.");
  if (c.status === "CANCELLED") return fail("Este contrato foi cancelado.");
  if (c.status === "ACCEPTED") return { ok: true, message: "Contrato já aceito." };
  const { error } = await admin
    .from("contracts")
    .update({ status: "ACCEPTED", accepted_at: new Date().toISOString(), accepted_name: parsed.data.accepted_name })
    .eq("id", c.id);
  if (error) return fail(translateDbError(error));
  return { ok: true, message: "Contrato aceito. Obrigado!" };
}


const doorPaySchema = z.object({
  token: z.string().min(10),
  amount: z.string().transform((v) => Number(String(v).replace(/\./g, "").replace(",", "."))).refine((v) => v > 0, "Valor inválido"),
  method: z.enum(["PIX", "CASH", "CARD", "TRANSFER", "OTHER"]).default("PIX"),
});

/** Door: records a payment received when closing the party account (extras). */
export async function doorRegisterPayment(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = doorPaySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Verifique o valor.");
  const ctx = await eventByLink(parsed.data.token, "CHECKIN");
  if (!ctx) return fail("Este link não está mais disponível.");
  const { error } = await ctx.admin.from("payments").insert({
    organization_id: ctx.link.organization_id,
    event_id: ctx.link.event_id,
    amount: parsed.data.amount,
    method: parsed.data.method,
    notes: "Fechamento da conta na portaria",
  });
  if (error) return fail(translateDbError(error));
  revalidatePath(`/d/${parsed.data.token}`);
  revalidatePath(`/eventos/${ctx.link.event_id}`);
  return { ok: true, message: "Recebimento registrado." };
}
