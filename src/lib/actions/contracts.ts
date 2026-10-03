"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getOrganization, requireProfile } from "@/lib/data/session";
import { fail, translateDbError, type ActionResult } from "@/lib/action-result";
import { insertContract } from "@/lib/confirmation";
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
  try {
    const id = await insertContract({ supabase, org, userId: profile.id }, idp.data, "DRAFT");
    revalidate(idp.data);
    return { ok: true, data: { id } };
  } catch (e) {
    return fail(translateDbError(e as { message: string }));
  }
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
