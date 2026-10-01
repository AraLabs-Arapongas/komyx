"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data/session";
import { fail, translateDbError, type ActionResult } from "@/lib/action-result";
import { formToObject, optionalText, phoneSchema, uuid, zodFieldErrors } from "./helpers";

const customerSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome"),
  whatsapp: phoneSchema,
  email: z.string().trim().email("E-mail inválido").optional().or(z.literal("")).transform((v) => v || null),
  document: optionalText,
  source: optionalText,
  notes: optionalText,
  marketing_opt_in: z.union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")]).optional().transform((v) => v === undefined ? undefined : v === "on" || v === "true"),
});

export async function createCustomer(_prev: ActionResult<{ id: string }> | undefined, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const parsed = customerSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fail("Verifique os campos.", zodFieldErrors(parsed.error));
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({ ...parsed.data, organization_id: profile.organization_id })
    .select("id")
    .single();
  if (error) return fail(translateDbError(error));
  revalidatePath("/clientes");
  const returnTo = formData.get("return_to");
  if (typeof returnTo === "string" && returnTo.startsWith("/")) redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}customer=${data.id}`);
  redirect(`/clientes/${data.id}`);
}

export async function updateCustomer(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return fail("Cliente inválido.");
  const parsed = customerSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fail("Verifique os campos.", zodFieldErrors(parsed.error));
  const supabase = await createClient();
  const { error } = await supabase.from("customers").update(parsed.data).eq("id", id.data);
  if (error) return fail(translateDbError(error));
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id.data}`);
  return { ok: true, message: "Cliente atualizado." };
}

/** Find or create a customer by WhatsApp inside the org. Used by the quick pre-reservation form. */
export async function upsertCustomerByPhone(orgId: string, name: string, whatsapp: string, source?: string | null) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("organization_id", orgId)
    .eq("whatsapp", whatsapp)
    .maybeSingle();
  if (existing) return { id: existing.id, error: null };
  const { data, error } = await supabase
    .from("customers")
    .insert({ organization_id: orgId, name, whatsapp, source: source ?? null })
    .select("id")
    .single();
  return { id: data?.id ?? null, error };
}
