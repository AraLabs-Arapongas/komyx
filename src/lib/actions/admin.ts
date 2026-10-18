"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/data/session";
import { fail, translateDbError, type ActionResult } from "@/lib/action-result";
import { appUrl, slugify } from "@/lib/utils";
import { attachUserToOrg } from "@/lib/data/attach-user";
import { logAdminAction } from "@/lib/admin/audit";
import { formToObject, optionalText, phoneSchema, uuid, zodFieldErrors } from "./helpers";
import { passwordSetupLink, emailIsLogged } from "@/lib/auth/access-link";
import { renderTemplate } from "@/lib/email/templates";
import { sendLoggedEmail } from "@/lib/email/message-log";

/** All admin actions run with the service role after verifying the platform-admin flag. */

const dateOrNull = z.string().optional().transform((v) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null));
const orgAdminSchema = z.object({
  id: uuid,
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use letras minúsculas, números e hífens"),
  plan: z.enum(["basic", "premium"]),
  status: z.enum(["active", "suspended", "cancelled"]),
  notes: optionalText,
  billing_cycle_start: dateOrNull,
  billing_due_at: dateOrNull,
  billing_status: z.enum(["ok", "due", "overdue", "trial"]).default("ok"),
});

export async function adminUpdateOrganization(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const me = await requireAdmin();
  const parsed = orgAdminSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fail("Verifique os campos.", zodFieldErrors(parsed.error));
  const { id, billing_cycle_start, billing_due_at, billing_status, ...patch } = parsed.data;
  const admin = createAdminClient();
  const [{ data: oldOrg }, { data: oldBill }] = await Promise.all([
    admin.from("organizations").select("slug, plan, status, notes").eq("id", id).maybeSingle(),
    admin.from("organization_billing").select("cycle_start, due_at, status").eq("organization_id", id).maybeSingle(),
  ]);
  const { error } = await admin.from("organizations").update(patch).eq("id", id);
  if (error) return fail(translateDbError(error));
  const { error: bErr } = await admin.from("organization_billing").upsert({ organization_id: id, cycle_start: billing_cycle_start, due_at: billing_due_at, status: billing_status, updated_at: new Date().toISOString() });
  if (bErr) return fail(translateDbError(bErr));

  // Only the fields that changed, as { field: [before, after] }.
  const before: Record<string, unknown> = { slug: oldOrg?.slug, plan: oldOrg?.plan, status: oldOrg?.status, notes: oldOrg?.notes ?? null, billing_cycle_start: oldBill?.cycle_start ?? null, billing_due_at: oldBill?.due_at ?? null, billing_status: oldBill?.status ?? null };
  const after: Record<string, unknown> = { ...patch, billing_cycle_start, billing_due_at, billing_status };
  const changes = Object.fromEntries(Object.keys(after).filter((k) => (before[k] ?? null) !== (after[k] ?? null)).map((k) => [k, [before[k] ?? null, after[k] ?? null]]));
  if (Object.keys(changes).length) {
    const action = patch.status !== oldOrg?.status
      ? (patch.status === "suspended" ? "org.suspend" : patch.status === "active" ? "org.reactivate" : "org.update")
      : patch.plan !== oldOrg?.plan ? "org.plan" : "org.update";
    await logAdminAction(me, action, { organizationId: id, details: { changes } });
  }
  revalidatePath("/admin");
  revalidatePath(`/admin/buffets/${id}`);
  revalidatePath("/admin/buffets");
  return { ok: true, message: "Buffet atualizado." };
}

const newBuffetSchema = z.object({
  org_name: z.string().trim().min(2, "Informe o nome do buffet"),
  slug: z.string().trim().toLowerCase().optional().transform((v) => (v ? v : null)).refine((v) => v === null || /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v), "Slug inválido"),
  plan: z.enum(["basic", "premium"]).default("basic"),
  owner_name: z.string().trim().min(2, "Informe o nome do responsável"),
  owner_email: z.string().trim().email("E-mail inválido"),
  whatsapp: z.string().optional().transform((v) => (v ? v : "")).pipe(z.union([z.literal(""), phoneSchema])).transform((v) => v || null),
});

/** Creates the organization and its owner account in one go (used when Komyx onboards a buffet by hand). */
export async function adminCreateBuffet(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const me = await requireAdmin();
  const parsed = newBuffetSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fail("Verifique os campos.", zodFieldErrors(parsed.error));
  const d = parsed.data;
  const admin = createAdminClient();

  let slug = d.slug ?? slugify(d.org_name) ?? "buffet";
  for (let i = 1; ; i++) {
    const { data: taken } = await admin.from("organizations").select("id").eq("slug", slug).maybeSingle();
    if (!taken) break;
    slug = `${d.slug ?? slugify(d.org_name)}-${i}`;
  }

  const { data: org, error: orgErr } = await admin.from("organizations").insert({ name: d.org_name, slug, plan: d.plan, whatsapp: d.whatsapp }).select("id").single();
  if (orgErr || !org) return fail(translateDbError(orgErr));

  // No password here: the owner creates it from the welcome e-mail (passwords never travel by e-mail).
  const { data: created, error: userErr } = await admin.auth.admin.createUser({
    email: d.owner_email,
    email_confirm: true,
    user_metadata: { name: d.owner_name },
    app_metadata: { organization_id: org.id, role: "owner" },
  });
  if (userErr || !created.user) {
    await admin.from("organizations").delete().eq("id", org.id);
    return fail(userErr?.message.includes("already") ? "Este e-mail já está em uso." : userErr?.message ?? "Erro ao criar usuário.");
  }
  await attachUserToOrg(admin, created.user.id, org.id, "owner");
  await sendOwnerEmail(admin, "welcome_owner", { email: d.owner_email, name: d.owner_name, buffet: d.org_name, orgId: org.id });
  await logAdminAction(me, "org.create", { organizationId: org.id, details: { name: d.org_name, slug, plan: d.plan, owner_email: d.owner_email } });
  revalidatePath("/admin");
  revalidatePath("/admin/buffets");
  redirect(`/admin/buffets/${org.id}?created=1`);
}

const resetSchema = z.object({ user_id: uuid, org_id: uuid, password: z.string().min(8, "Mínimo de 8 caracteres") });

export async function adminResetPassword(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const me = await requireAdmin();
  const parsed = resetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Verifique os campos.", zodFieldErrors(parsed.error));
  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("organization_id, email").eq("id", parsed.data.user_id).single();
  if (!target || target.organization_id !== parsed.data.org_id) return fail("Usuário não pertence a este buffet.");
  // A password set by the admin is temporary: the next sign-in asks the person to create their own
  // (app_metadata.must_change_password, checked in requireProfile). app_metadata is replaced, so keep the rest.
  const { data: u } = await admin.auth.admin.getUserById(parsed.data.user_id);
  const { error } = await admin.auth.admin.updateUserById(parsed.data.user_id, {
    password: parsed.data.password,
    app_metadata: { ...(u.user?.app_metadata ?? {}), must_change_password: true },
  });
  if (error) return fail(error.message);
  const { data: org } = await admin.from("organizations").select("name").eq("id", parsed.data.org_id).single();
  const { data: person } = await admin.from("profiles").select("name").eq("id", parsed.data.user_id).single();
  await sendOwnerEmail(admin, "password_set_by_admin", { email: target.email, name: person?.name ?? "", buffet: org?.name ?? "seu buffet", orgId: parsed.data.org_id });
  await logAdminAction(me, "user.password_set", { organizationId: parsed.data.org_id, details: { user_id: parsed.data.user_id, email: target.email } });
  return { ok: true, message: "Senha provisória definida. A pessoa recebeu um aviso por e-mail (sem a senha) e vai criar a dela ao entrar. Passe a senha provisória por telefone ou WhatsApp." };
}

const promoteSchema = z.object({ user_id: uuid, org_id: uuid, role: z.enum(["owner", "staff"]) });

export async function adminSetRole(formData: FormData) {
  const me = await requireAdmin();
  const parsed = promoteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const admin = createAdminClient();
  const { data: changed, error } = await admin.from("profiles").update({ role: parsed.data.role }).eq("id", parsed.data.user_id).eq("organization_id", parsed.data.org_id).select("email").maybeSingle();
  if (!error && changed) await logAdminAction(me, "user.role", { organizationId: parsed.data.org_id, details: { user_id: parsed.data.user_id, email: changed.email, role: parsed.data.role } });
  revalidatePath(`/admin/buffets/${parsed.data.org_id}`);
}

export async function adminTogglePlatformAdmin(formData: FormData) {
  const me = await requireAdmin();
  const userId = String(formData.get("user_id") ?? "");
  const grant = formData.get("grant") === "true";
  if (!uuid.safeParse(userId).success || userId === me.id) return;
  const admin = createAdminClient();
  const { data: changed, error } = await admin.from("profiles").update({ is_platform_admin: grant }).eq("id", userId).select("email, organization_id").maybeSingle();
  if (!error && changed) await logAdminAction(me, grant ? "user.admin_grant" : "user.admin_revoke", { organizationId: changed.organization_id, details: { user_id: userId, email: changed.email } });
  revalidatePath("/admin/equipe");
}

const sendResetSchema = z.object({ user_id: uuid, org_id: uuid });

/** Sends the "Redefinir senha" e-mail (rendered by the send_email hook) to a member of the buffet. */
export async function adminSendPasswordReset(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const me = await requireAdmin();
  const parsed = sendResetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Verifique os campos.");
  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("organization_id, email").eq("id", parsed.data.user_id).maybeSingle();
  if (!target || target.organization_id !== parsed.data.org_id) return fail("Usuário não pertence a este buffet.");
  const { error } = await admin.auth.resetPasswordForEmail(target.email);
  if (error) {
    if (error.status === 429 || error.code === "over_email_send_rate_limit") return fail("Muitos pedidos seguidos. Espere um minuto e tente de novo.");
    return fail("Não conseguimos enviar o e-mail agora. Tente de novo em instantes.");
  }
  await logAdminAction(me, "user.password_reset", { organizationId: parsed.data.org_id, details: { user_id: parsed.data.user_id, email: target.email } });
  return { ok: true, message: `E-mail de senha enviado para ${target.email}.` };
}

/** Welcome / password-notice e-mails to a buffet member. Never contains a password. Never throws. */
async function sendOwnerEmail(admin: ReturnType<typeof createAdminClient>, key: "welcome_owner" | "password_set_by_admin", p: { email: string; name: string; buffet: string; orgId: string }) {
  try {
    const link = key === "welcome_owner" ? await passwordSetupLink(admin, p.email) : appUrl("/login");
    const { subject, html, text } = await renderTemplate(key, { buffet: p.buffet, quem: p.name.trim().split(/\s+/)[0] ?? "", link });
    await sendLoggedEmail({ to: p.email, subject, html, text }, { kind: key === "welcome_owner" ? "welcome" : "admin_password", organizationId: p.orgId });
  } catch (e) {
    console.error("[admin-email]", key, e);
  }
}

/**
 * Local/staging only (e-mail is just logged there): a fresh "create your password" link for a member,
 * shown to the admin so the flow can be tested. Production delivers it by e-mail instead.
 */
export async function adminAccessLink(_prev: ActionResult<{ link: string }> | undefined, formData: FormData): Promise<ActionResult<{ link: string }>> {
  const me = await requireAdmin();
  if (!emailIsLogged()) return fail("Em produção o link vai por e-mail: use Reenviar e-mail de senha.");
  const userId = uuid.safeParse(formData.get("user_id"));
  if (!userId.success) return fail("Pessoa inválida.");
  const admin = createAdminClient();
  const { data: person } = await admin.from("profiles").select("email, organization_id").eq("id", userId.data).single();
  if (!person) return fail("Pessoa não encontrada.");
  try {
    const link = await passwordSetupLink(admin, person.email);
    await logAdminAction(me, "user.access_link", { organizationId: person.organization_id, details: { email: person.email } });
    return { ok: true, data: { link } };
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}
