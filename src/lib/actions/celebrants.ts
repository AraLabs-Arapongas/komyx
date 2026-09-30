"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data/session";
import { fail, translateDbError, type ActionResult } from "@/lib/action-result";
import { dateSchema, optionalText, uuid, zodFieldErrors } from "./helpers";

const schema = z.object({
  customer_id: uuid,
  event_id: z.string().optional().transform((v) => (v ? v : null)),
  name: z.string().trim().min(1, "Informe o nome"),
  birth_date: dateSchema,
  notes: optionalText,
});

export async function addCelebrant(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Verifique os campos.", zodFieldErrors(parsed.error));
  const profile = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("celebrants").insert({ ...parsed.data, organization_id: profile.organization_id });
  if (error) return fail(translateDbError(error));
  revalidatePath("/aniversariantes");
  revalidatePath(`/clientes/${parsed.data.customer_id}`);
  if (parsed.data.event_id) revalidatePath(`/eventos/${parsed.data.event_id}`);
  return { ok: true, message: "Aniversariante salvo." };
}

export async function removeCelebrant(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("celebrants").delete().eq("id", id);
  revalidatePath("/aniversariantes");
}
