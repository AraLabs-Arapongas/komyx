"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getOrganization, requireProfile } from "@/lib/data/session";
import { fail, translateDbError, type ActionResult } from "@/lib/action-result";
import { renderContract } from "@/lib/contract";
import { eventTitle } from "@/components/events/event-card";
import { uuid } from "./helpers";

function revalidate(eventId: string) {
  revalidatePath(`/eventos/${eventId}`);
  revalidatePath(`/eventos/${eventId}/contrato`);
  revalidatePath("/orcamentos");
}

/** Renders the org template with event + latest quote data and stores a new contract version. */
export async function generateContract(eventId: string): Promise<ActionResult<{ id: string }>> {
  const idp = uuid.safeParse(eventId);
  if (!idp.success) return fail("Evento inválido.");
  const [profile, org] = await Promise.all([requireProfile(), getOrganization()]);
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, title, starts_at, ends_at, adults, children, celebrant_name, customers(name, document, whatsapp, email), packages(name)")
    .eq("id", idp.data)
    .single();
  if (!event || !event.customers) return fail("Evento não encontrado.");

  const { data: quote } = await supabase
    .from("quotes")
    .select("id, total, quote_items(description, quantity, unit_price, total, sort_order), quote_installments(label, percent, amount, rule, days_before, due_date, sequence)")
    .eq("event_id", event.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const content = renderContract(org.contract_template, {
    org,
    customer: event.customers,
    event: { title: eventTitle(event), starts_at: event.starts_at, ends_at: event.ends_at, adults: event.adults, children: event.children, celebrant_name: event.celebrant_name },
    packageName: event.packages?.name ?? null,
    items: [...(quote?.quote_items ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    total: quote?.total ?? 0,
    installments: [...(quote?.quote_installments ?? [])].sort((a, b) => a.sequence - b.sequence),
  });

  const { data, error } = await supabase
    .from("contracts")
    .insert({ organization_id: org.id, event_id: event.id, quote_id: quote?.id ?? null, content, created_by: profile.id })
    .select("id")
    .single();
  if (error || !data) return fail(translateDbError(error));
  revalidate(event.id);
  return { ok: true, data: { id: data.id } };
}

export async function generateContractAndGo(formData: FormData) {
  const eventId = String(formData.get("event_id") ?? "");
  const res = await generateContract(eventId);
  if (res.ok) redirect(`/eventos/${eventId}/contrato?c=${res.data!.id}`);
  redirect(`/eventos/${eventId}?error=${encodeURIComponent(res.error)}`);
}

const contentSchema = z.object({ id: uuid, event_id: uuid, content: z.string().min(50, "Contrato muito curto") });

export async function updateContractContent(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = contentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Verifique o texto.");
  const supabase = await createClient();
  const { data: c } = await supabase.from("contracts").select("status").eq("id", parsed.data.id).single();
  if (c?.status === "ACCEPTED") return fail("Contrato aceito não pode ser editado. Gere uma nova versão.");
  const { error } = await supabase.from("contracts").update({ content: parsed.data.content }).eq("id", parsed.data.id);
  if (error) return fail(translateDbError(error));
  revalidate(parsed.data.event_id);
  return { ok: true, message: "Contrato salvo." };
}

const statusSchema = z.object({ id: uuid, event_id: uuid, status: z.enum(["DRAFT", "SENT", "CANCELLED"]) });

export async function changeContractStatus(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = statusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Ação inválida.");
  const supabase = await createClient();
  const patch: { status: typeof parsed.data.status; sent_at?: string } = { status: parsed.data.status };
  if (parsed.data.status === "SENT") patch.sent_at = new Date().toISOString();
  const { error } = await supabase.from("contracts").update(patch).eq("id", parsed.data.id);
  if (error) return fail(translateDbError(error));
  revalidate(parsed.data.event_id);
  return { ok: true, message: "Status atualizado." };
}

/** Creates the first contract for an event when none exists yet (called when a quote is accepted). */
export async function ensureContract(eventId: string) {
  const supabase = await createClient();
  const { count } = await supabase.from("contracts").select("id", { count: "exact", head: true }).eq("event_id", eventId).neq("status", "CANCELLED");
  if ((count ?? 0) > 0) return;
  await generateContract(eventId);
}
