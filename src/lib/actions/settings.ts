"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOwner } from "@/lib/data/session";
import { fail, translateDbError, type ActionResult } from "@/lib/action-result";
import { formToObject, moneySchema, optionalText, phoneSchema, uuid, zodFieldErrors } from "./helpers";

const orgSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome"),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use letras minúsculas, números e hífens"),
  whatsapp: z.string().optional().transform((v) => (v ? v : "")).pipe(z.union([z.literal(""), phoneSchema])).transform((v) => v || null),
  address: optionalText,
  instagram: z.string().trim().optional().transform((v) => (v ? v.replace(/^@/, "") : null)),
  description: optionalText,
  default_event_duration_minutes: z.string().transform(Number).refine((v) => v >= 30 && v <= 1440, "Entre 30 e 1440 minutos"),
  pre_reservation_validity_hours: z.string().transform(Number).refine((v) => v >= 1 && v <= 720, "Entre 1 e 720 horas"),
});

export async function updateOrganization(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = orgSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fail("Verifique os campos.", zodFieldErrors(parsed.error));
  const profile = await requireOwner();
  const supabase = await createClient();
  const { error } = await supabase.from("organizations").update(parsed.data).eq("id", profile.organization_id);
  if (error) return fail(translateDbError(error));
  revalidatePath("/configuracoes");
  revalidatePath(`/p/${parsed.data.slug}`);
  return { ok: true, message: "Dados salvos." };
}

export async function uploadOrgImage(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const kind = formData.get("kind") === "cover" ? "cover" : "logo";
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Selecione uma imagem.");
  if (file.size > 5 * 1024 * 1024) return fail("Imagem muito grande (máx. 5MB).");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return fail("Use JPG, PNG ou WebP.");

  const profile = await requireOwner();
  const supabase = await createClient();
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${profile.organization_id}/${kind}-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage.from("org-media").upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) return fail(upErr.message);
  const { data: pub } = supabase.storage.from("org-media").getPublicUrl(path);
  const { error } = await supabase
    .from("organizations")
    .update(kind === "cover" ? { cover_url: pub.publicUrl } : { logo_url: pub.publicUrl })
    .eq("id", profile.organization_id);
  if (error) return fail(translateDbError(error));
  revalidatePath("/configuracoes");
  return { ok: true, message: "Imagem atualizada." };
}

const packageSchema = z.object({
  id: z.string().optional().transform((v) => (v ? v : null)),
  name: z.string().trim().min(2, "Informe o nome"),
  base_price: moneySchema,
  included_participants: z.string().transform((v) => Number(v || 0)).refine((v) => Number.isInteger(v) && v >= 0, "Inválido"),
  additional_participant_price: moneySchema,
  description: optionalText,
  active: z.string().optional().transform((v) => v !== "false"),
});

export async function savePackage(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = packageSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fail("Verifique os campos.", zodFieldErrors(parsed.error));
  const profile = await requireOwner();
  const supabase = await createClient();
  const { id, ...values } = parsed.data;
  const { error } = id
    ? await supabase.from("packages").update(values).eq("id", id)
    : await supabase.from("packages").insert({ ...values, organization_id: profile.organization_id });
  if (error) return fail(translateDbError(error));
  revalidatePath("/pacotes");
  return { ok: true, message: "Pacote salvo." };
}

export async function togglePackage(formData: FormData) {
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";
  const supabase = await createClient();
  await supabase.from("packages").update({ active }).eq("id", id);
  revalidatePath("/pacotes");
}

const addonSchema = z.object({
  id: z.string().optional().transform((v) => (v ? v : null)),
  name: z.string().trim().min(2, "Informe o nome"),
  price: moneySchema,
  description: optionalText,
});

export async function saveAddon(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = addonSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fail("Verifique os campos.", zodFieldErrors(parsed.error));
  const profile = await requireOwner();
  const supabase = await createClient();
  const { id, ...values } = parsed.data;
  const { error } = id
    ? await supabase.from("package_addons").update(values).eq("id", id)
    : await supabase.from("package_addons").insert({ ...values, organization_id: profile.organization_id });
  if (error) return fail(translateDbError(error));
  revalidatePath("/pacotes");
  return { ok: true, message: "Adicional salvo." };
}

export async function toggleAddon(formData: FormData) {
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";
  const supabase = await createClient();
  await supabase.from("package_addons").update({ active }).eq("id", id);
  revalidatePath("/pacotes");
}

const staffSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome"),
  email: z.string().trim().email("E-mail inválido"),
  password: z.string().min(8, "Mínimo de 8 caracteres"),
});

/**
 * Owner creates a staff account directly (no e-mail flow in the MVP).
 * organization_id/role go in app_metadata (not user-editable) and the DB trigger creates the profile.
 */
export async function createStaff(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = staffSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fail("Verifique os campos.", zodFieldErrors(parsed.error));
  const profile = await requireOwner();
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { name: parsed.data.name },
    app_metadata: { organization_id: profile.organization_id, role: "staff" },
  });
  if (error) return fail(error.message.includes("already") ? "Este e-mail já está em uso." : error.message);
  revalidatePath("/configuracoes");
  return { ok: true, message: "Usuário criado. Compartilhe a senha inicial com a pessoa." };
}

export async function removeStaff(formData: FormData) {
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return;
  const profile = await requireOwner();
  if (id.data === profile.id) return;
  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("organization_id, role").eq("id", id.data).single();
  if (!target || target.organization_id !== profile.organization_id || target.role === "owner") return;
  await admin.auth.admin.deleteUser(id.data);
  revalidatePath("/configuracoes");
}
