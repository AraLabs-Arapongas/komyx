"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
  if (error) {
    // Only a real credential mismatch is "wrong password"; anything else (server down, wrong
    // Supabase URL in .env.local) should not send people hunting for a typo.
    // Checked first: an unconfirmed account also answers 400, and "wrong password" would be a lie.
    if (error.code === "email_not_confirmed") return fail("Seu e-mail ainda não foi confirmado. Abra o link que enviamos no cadastro, ou use \"Esqueci minha senha\" para receber um novo.");
    if (error.code === "user_banned") return fail("Este acesso está bloqueado. Fale com o suporte da Komyx.");
    if (error.code === "invalid_credentials" || error.status === 400) return fail("E-mail ou senha incorretos.");
    return fail("Não foi possível falar com o servidor de login. Tente de novo em instantes.");
  }

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

const forgotSchema = z.object({ email: z.string().trim().email("E-mail inválido") });

/**
 * Sends the recovery email (through the send_email hook). The answer is the same whether or not
 * the address has an account, so the form can't be used to find out who uses Komyx.
 */
export async function requestPasswordReset(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = forgotSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Verifique os campos.", flatten(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email.toLowerCase());
  if (error) {
    if (error.status === 429 || error.code === "over_email_send_rate_limit") return fail("Muitos pedidos seguidos. Espere um minuto e tente de novo.");
    // Unknown addresses don't error; anything here is the server or the email provider.
    if (error.status && error.status >= 500) return fail("Não conseguimos enviar o e-mail agora. Tente de novo em instantes.");
  }
  return { ok: true, message: "Se existir uma conta com esse e-mail, enviamos um link para criar uma nova senha. Confira também a caixa de spam." };
}

const newPasswordSchema = z.object({
  password: z.string().min(8, "Use pelo menos 8 caracteres"),
  confirm_password: z.string(),
}).refine((d) => d.password === d.confirm_password, { message: "As senhas não conferem", path: ["confirm_password"] });

/** Second step of the recovery: the email link already signed the person in (/auth/confirm). */
export async function setNewPassword(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = newPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Verifique os campos.", flatten(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return fail("Escolha uma senha diferente da anterior.", { password: "Igual à senha anterior" });
    if (error.code === "weak_password") return fail("Senha fraca. Use pelo menos 8 caracteres.", { password: "Senha fraca" });
    return fail("Não foi possível salvar a nova senha. Peça um novo link e tente de novo.");
  }
  // The temporary password is gone: clear the flag (app_metadata is replaced, so keep the rest) and
  // refresh the session so the new token no longer carries it.
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.app_metadata?.must_change_password) {
    await createAdminClient().auth.admin.updateUserById(user.id, { app_metadata: { ...user.app_metadata, must_change_password: false } });
    await supabase.auth.refreshSession();
  }
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
