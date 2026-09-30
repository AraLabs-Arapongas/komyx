"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fail, type ActionResult } from "@/lib/action-result";

const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido"),
  password: z.string().min(6, "Senha muito curta"),
  next: z.string().optional(),
});

export async function login(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Verifique os campos.", flatten(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error) return fail("E-mail ou senha incorretos.");

  const next = parsed.data.next && parsed.data.next.startsWith("/") ? parsed.data.next : "/home";
  redirect(next);
}

const signupSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome"),
  org_name: z.string().trim().min(2, "Informe o nome do buffet"),
  email: z.string().trim().email("E-mail inválido"),
  password: z.string().min(8, "Use pelo menos 8 caracteres"),
});

export async function signup(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Verifique os campos.", flatten(parsed.error));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { name: parsed.data.name, org_name: parsed.data.org_name } },
  });
  if (error) return fail(error.message.includes("registered") ? "Este e-mail já está cadastrado." : error.message);
  if (!data.session) return { ok: true, message: "Conta criada. Confirme seu e-mail para entrar." };

  redirect("/home");
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

function flatten(err: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
