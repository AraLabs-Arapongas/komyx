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
  legal_name: optionalText,
  document: optionalText,
  city: optionalText,
  pix_key: optionalText,
});

const installmentRule = z.enum(["ON_ACCEPT", "DAYS_BEFORE_EVENT", "FIXED_DATE"]);
const planSchema = z
  .array(z.object({
    label: z.string().trim().min(1, "Informe o nome da parcela"),
    percent: z.number().min(0).max(100),
    rule: installmentRule,
    days_before: z.number().int().min(0).nullable(),
  }))
  .min(1, "Adicione ao menos uma parcela")
  .refine((items) => Math.abs(items.reduce((a, i) => a + i.percent, 0) - 100) < 0.01, "Os percentuais devem somar 100%");

export async function updatePaymentPlan(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const labels = formData.getAll("label").map(String);
  const percents = formData.getAll("percent").map((v) => Number(String(v).replace(",", ".")));
  const rules = formData.getAll("rule").map(String);
  const days = formData.getAll("days_before").map((v) => (String(v).trim() === "" ? null : Number(v)));
  const items = labels.map((label, i) => ({ label, percent: percents[i] ?? 0, rule: rules[i] as z.infer<typeof installmentRule>, days_before: rules[i] === "DAYS_BEFORE_EVENT" ? days[i] ?? 0 : null }));
  const parsed = planSchema.safeParse(items);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Plano inválido.");
  const profile = await requireOwner();
  const supabase = await createClient();
  const { error } = await supabase.from("organizations").update({ payment_plan: parsed.data }).eq("id", profile.organization_id);
  if (error) return fail(translateDbError(error));
  revalidatePath("/configuracoes");
  return { ok: true, message: "Plano de pagamento salvo. Vale para novos orçamentos." };
}

export async function updateContractTemplate(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const template = String(formData.get("contract_template") ?? "").trim();
  if (template.length < 50) return fail("O modelo de contrato está muito curto.");
  const profile = await requireOwner();
  const supabase = await createClient();
  const { error } = await supabase.from("organizations").update({ contract_template: template }).eq("id", profile.organization_id);
  if (error) return fail(translateDbError(error));
  revalidatePath("/configuracoes");
  return { ok: true, message: "Modelo de contrato salvo." };
}

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
  included_adults: z.string().optional().transform((v) => Number(v || 0)).refine((v) => Number.isInteger(v) && v >= 0, "Inválido"),
  included_children: z.string().optional().transform((v) => Number(v || 0)).refine((v) => Number.isInteger(v) && v >= 0, "Inválido"),
  extra_adult_price: z.string().optional().transform((v) => Number(String(v || "0").replace(/\./g, "").replace(",", "."))).refine((v) => Number.isFinite(v) && v >= 0, "Valor inválido"),
  extra_child_price: z.string().optional().transform((v) => Number(String(v || "0").replace(/\./g, "").replace(",", "."))).refine((v) => Number.isFinite(v) && v >= 0, "Valor inválido"),
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

const profileSchema = z.object({
  tagline: optionalText,
  highlights: z.string().optional().transform((v) => (v ?? "").split(/\n|,/).map((s) => s.trim()).filter(Boolean).slice(0, 12)),
  testimonials: z.string().optional().transform((v) =>
    (v ?? "")
      .split(/\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const m = line.match(/^(.+?)\s*[—:-]\s*(.+)$/);
        return m ? { name: m[1].trim(), text: m[2].trim() } : { name: "Cliente", text: line };
      })
      .slice(0, 6),
  ),
  founded_year: z.string().optional().transform((v) => (v && v.trim() ? Number(v) : null)).refine((v) => v === null || (Number.isInteger(v) && v >= 1950 && v <= 2100), "Ano inválido"),
  capacity: z.string().optional().transform((v) => (v && v.trim() ? Number(v) : null)).refine((v) => v === null || (Number.isInteger(v) && v > 0), "Capacidade inválida"),
  one_event_per_day: z.string().optional().transform((v) => v === "on" || v === "true"),
});

export async function updatePublicProfile(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fail("Verifique os campos.", zodFieldErrors(parsed.error));
  const profile = await requireOwner();
  const supabase = await createClient();
  const { error } = await supabase.from("organizations").update(parsed.data).eq("id", profile.organization_id);
  if (error) return fail(translateDbError(error));
  revalidatePath("/configuracoes");
  return { ok: true, message: "Página pública atualizada." };
}

type GalleryItem = { url: string; caption?: string | null };

export async function uploadGalleryImages(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return fail("Selecione ao menos uma imagem.");
  const profile = await requireOwner();
  const supabase = await createClient();
  const { data: org } = await supabase.from("organizations").select("gallery").eq("id", profile.organization_id).single();
  const current = (Array.isArray(org?.gallery) ? org!.gallery : []) as GalleryItem[];
  if (current.length + files.length > 12) return fail("Máximo de 12 fotos na galeria.");
  const added: GalleryItem[] = [];
  for (const file of files) {
    if (file.size > 8 * 1024 * 1024) return fail(`${file.name}: imagem muito grande (máx. 8MB).`);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return fail(`${file.name}: use JPG, PNG ou WebP.`);
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${profile.organization_id}/gallery/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("org-media").upload(path, file, { contentType: file.type });
    if (upErr) return fail(upErr.message);
    added.push({ url: supabase.storage.from("org-media").getPublicUrl(path).data.publicUrl, caption: null });
  }
  const { error } = await supabase.from("organizations").update({ gallery: [...current, ...added] }).eq("id", profile.organization_id);
  if (error) return fail(translateDbError(error));
  revalidatePath("/configuracoes");
  return { ok: true, message: `${added.length} foto(s) adicionada(s).` };
}

export async function updateGalleryCaption(formData: FormData) {
  const url = String(formData.get("url") ?? "");
  const caption = String(formData.get("caption") ?? "").trim().slice(0, 120);
  const profile = await requireOwner();
  const supabase = await createClient();
  const { data: org } = await supabase.from("organizations").select("gallery").eq("id", profile.organization_id).single();
  const current = (Array.isArray(org?.gallery) ? org!.gallery : []) as GalleryItem[];
  await supabase.from("organizations").update({ gallery: current.map((g) => (g.url === url ? { ...g, caption: caption || null } : g)) }).eq("id", profile.organization_id);
  revalidatePath("/configuracoes");
}

export async function removeGalleryImage(formData: FormData) {
  const url = String(formData.get("url") ?? "");
  const profile = await requireOwner();
  const supabase = await createClient();
  const { data: org } = await supabase.from("organizations").select("gallery").eq("id", profile.organization_id).single();
  const current = (Array.isArray(org?.gallery) ? org!.gallery : []) as GalleryItem[];
  await supabase.from("organizations").update({ gallery: current.filter((g) => g.url !== url) }).eq("id", profile.organization_id);
  const marker = "/org-media/";
  const idx = url.indexOf(marker);
  if (idx > 0) await supabase.storage.from("org-media").remove([url.slice(idx + marker.length)]);
  revalidatePath("/configuracoes");
}
