"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/data/session";
import { fail, translateDbError, type ActionResult } from "@/lib/action-result";
import { slugify } from "@/lib/utils";
import { attachUserToOrg } from "@/lib/data/attach-user";
import { logAdminAction } from "@/lib/admin/audit";
import { formToObject, optionalText, phoneSchema, uuid, zodFieldErrors } from "./helpers";

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
  owner_password: z.string().min(8, "Mínimo de 8 caracteres"),
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

  const { data: created, error: userErr } = await admin.auth.admin.createUser({
    email: d.owner_email,
    password: d.owner_password,
    email_confirm: true,
    user_metadata: { name: d.owner_name },
    app_metadata: { organization_id: org.id, role: "owner" },
  });
  if (userErr || !created.user) {
    await admin.from("organizations").delete().eq("id", org.id);
    return fail(userErr?.message.includes("already") ? "Este e-mail já está em uso." : userErr?.message ?? "Erro ao criar usuário.");
  }
  await attachUserToOrg(admin, created.user.id, org.id, "owner");
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
  const { error } = await admin.auth.admin.updateUserById(parsed.data.user_id, { password: parsed.data.password });
  if (error) return fail(error.message);
  await logAdminAction(me, "user.password_set", { organizationId: parsed.data.org_id, details: { user_id: parsed.data.user_id, email: target.email } });
  return { ok: true, message: "Senha redefinida. Envie a nova senha ao responsável." };
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
