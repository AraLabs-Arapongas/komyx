"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail, translateDbError, type ActionResult } from "@/lib/action-result";
import { dateSchema, optionalText, phoneSchema, zodFieldErrors } from "./helpers";

/**
 * Public actions run with the service role on the server. Every query is scoped by
 * the random token / slug and only the minimum data is written.
 */

const guestConfirmSchema = z.object({
  token: z.string().min(20),
  name: z.string().trim().min(2, "Informe seu nome"),
  participants: z.string().transform(Number).refine((v) => Number.isInteger(v) && v >= 1 && v <= 50, "Entre 1 e 50"),
  notes: optionalText,
});

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
    participants: parsed.data.participants,
    notes: parsed.data.notes,
    source: "PUBLIC",
  });
  if (error) return fail(translateDbError(error));
  return { ok: true, message: "Presença confirmada. Obrigado!" };
}

const requestSchema = z.object({
  slug: z.string().min(1),
  name: z.string().trim().min(2, "Informe seu nome"),
  whatsapp: phoneSchema,
  desired_date: z.union([dateSchema, z.literal("")]).transform((v) => v || null),
  desired_time: z.string().optional().transform((v) => (v && /^\d{2}:\d{2}$/.test(v) ? v : null)),
  participants: z.string().optional().transform((v) => (v ? Number(v) : null)).refine((v) => v === null || (Number.isInteger(v) && v >= 0), "Inválido"),
  message: optionalText,
});

export async function submitPublicRequest(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = requestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Verifique os campos.", zodFieldErrors(parsed.error));
  const admin = createAdminClient();
  const { data: org } = await admin.from("organizations").select("id").eq("slug", parsed.data.slug).maybeSingle();
  if (!org) return fail("Buffet não encontrado.");
  const { slug: _slug, ...values } = parsed.data;
  void _slug;
  const { error } = await admin.from("public_requests").insert({ ...values, organization_id: org.id });
  if (error) return fail(translateDbError(error));
  return { ok: true, message: "Recebemos sua solicitação! Em breve entraremos em contato pelo WhatsApp." };
}
