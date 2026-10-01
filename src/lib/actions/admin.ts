"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/data/session";
import { fail, translateDbError, type ActionResult } from "@/lib/action-result";
import { slugify } from "@/lib/utils";
import { formToObject, optionalText, phoneSchema, uuid, zodFieldErrors } from "./helpers";

/** All admin actions run with the service role after verifying the platform-admin flag. */

const orgAdminSchema = z.object({
  id: uuid,
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use letras minúsculas, números e hífens"),
  plan: z.enum(["basic", "premium"]),
  status: z.enum(["active", "suspended"]),
  notes: optionalText,
});

export async function adminUpdateOrganization(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = orgAdminSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fail("Verifique os campos.", zodFieldErrors(parsed.error));
  const { id, ...patch } = parsed.data;
  const admin = createAdminClient();
  const { error } = await admin.from("organizations").update(patch).eq("id", id);
  if (error) return fail(translateDbError(error));
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

/** Creates the organization and its owner account in one go (used when Festeja onboards a buffet by hand). */
export async function adminCreateBuffet(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
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

  const { error: userErr } = await admin.auth.admin.createUser({
    email: d.owner_email,
    password: d.owner_password,
    email_confirm: true,
    user_metadata: { name: d.owner_name },
    app_metadata: { organization_id: org.id, role: "owner" },
  });
  if (userErr) {
    await admin.from("organizations").delete().eq("id", org.id);
    return fail(userErr.message.includes("already") ? "Este e-mail já está em uso." : userErr.message);
  }
  revalidatePath("/admin");
  revalidatePath("/admin/buffets");
  redirect(`/admin/buffets/${org.id}?created=1`);
}

const resetSchema = z.object({ user_id: uuid, org_id: uuid, password: z.string().min(8, "Mínimo de 8 caracteres") });

export async function adminResetPassword(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = resetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Verifique os campos.", zodFieldErrors(parsed.error));
  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("organization_id").eq("id", parsed.data.user_id).single();
  if (!target || target.organization_id !== parsed.data.org_id) return fail("Usuário não pertence a este buffet.");
  const { error } = await admin.auth.admin.updateUserById(parsed.data.user_id, { password: parsed.data.password });
  if (error) return fail(error.message);
  return { ok: true, message: "Senha redefinida. Envie a nova senha ao responsável." };
}

const promoteSchema = z.object({ user_id: uuid, org_id: uuid, role: z.enum(["owner", "staff"]) });

export async function adminSetRole(formData: FormData) {
  await requireAdmin();
  const parsed = promoteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const admin = createAdminClient();
  await admin.from("profiles").update({ role: parsed.data.role }).eq("id", parsed.data.user_id).eq("organization_id", parsed.data.org_id);
  revalidatePath(`/admin/buffets/${parsed.data.org_id}`);
}

export async function adminTogglePlatformAdmin(formData: FormData) {
  const me = await requireAdmin();
  const userId = String(formData.get("user_id") ?? "");
  const grant = formData.get("grant") === "true";
  if (!uuid.safeParse(userId).success || userId === me.id) return;
  const admin = createAdminClient();
  await admin.from("profiles").update({ is_platform_admin: grant }).eq("id", userId);
  revalidatePath("/admin/equipe");
}
