"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data/session";
import { fail, translateDbError, type ActionResult } from "@/lib/action-result";
import { zodFieldErrors } from "./helpers";

const nameSchema = z.object({ name: z.string().trim().min(2, "Informe seu nome") });

export async function updateMyName(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = nameSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Verifique os campos.", zodFieldErrors(parsed.error));
  const profile = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ name: parsed.data.name }).eq("id", profile.id);
  if (error) return fail(translateDbError(error));
  revalidatePath("/", "layout");
  return { ok: true, message: "Nome atualizado." };
}

const passwordSchema = z.object({
  current_password: z.string().min(1, "Informe a senha atual"),
  new_password: z.string().min(8, "Mínimo de 8 caracteres"),
  confirm_password: z.string(),
}).refine((d) => d.new_password === d.confirm_password, { message: "As senhas não conferem", path: ["confirm_password"] });

/** Re-authenticates with the current password before changing it. */
export async function changeMyPassword(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Verifique os campos.", zodFieldErrors(parsed.error));
  const profile = await requireProfile();
  const supabase = await createClient();
  const { error: authErr } = await supabase.auth.signInWithPassword({ email: profile.email, password: parsed.data.current_password });
  if (authErr) return fail("Senha atual incorreta.", { current_password: "Senha atual incorreta" });
  const { error } = await supabase.auth.updateUser({ password: parsed.data.new_password });
  if (error) return fail("Não foi possível alterar a senha. Tente de novo.");
  return { ok: true, message: "Senha alterada." };
}
