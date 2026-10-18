"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/data/session";
import { logAdminAction } from "@/lib/admin/audit";
import { fail, translateDbError, type ActionResult } from "@/lib/action-result";
import { renderNotificationEmail } from "@/lib/email/templates";
import { isTemplateKey, renderCopy, SAMPLE_VARS } from "@/lib/email/template-copy";
import { errorText, logMessage, sendLoggedEmail } from "@/lib/email/message-log";
import { announcementRecipients, sendAnnouncementEmails } from "@/lib/email/announcements";
import { localToIso } from "@/lib/utils";
import { formToObject, uuid, zodFieldErrors } from "./helpers";

/** /admin/emails and /admin/avisos: e-mail templates, resending failed messages, platform announcements. */

const text = (max: number) => z.string().trim().min(1, "Obrigatório").max(max, `Máximo de ${max} caracteres`);
const templateSchema = z.object({
  key: z.string().refine(isTemplateKey, "Modelo desconhecido"),
  subject: text(200),
  title: text(200),
  intro: text(2000),
  button: text(60),
  outro: text(1000),
  intent: z.enum(["save", "test"]).default("save"),
});

/** Saves a template, or (intent=test) sends the form's current copy to the admin's own e-mail. */
export async function saveEmailTemplate(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const profile = await requireAdmin();
  const parsed = templateSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fail("Verifique os campos.", zodFieldErrors(parsed.error));
  const { key, intent, ...copy } = parsed.data;

  if (intent === "test") {
    const { subject, html, text } = renderCopy(copy, SAMPLE_VARS);
    const sent = await sendLoggedEmail({ to: profile.email, subject: `[Teste] ${subject}`, html, text }, { kind: "test" });
    revalidatePath("/admin/emails");
    return sent.ok ? { ok: true, message: `Teste enviado para ${profile.email}.` } : fail(`Não foi possível enviar: ${sent.error}`);
  }

  const { error } = await createAdminClient().from("email_templates").update({ ...copy, updated_at: new Date().toISOString(), updated_by: profile.id }).eq("key", key);
  if (error) return fail(translateDbError(error));
  await logAdminAction(profile, "template.update", { details: { key } });
  revalidatePath("/admin/emails");
  return { ok: true, message: "Modelo salvo. Os próximos e-mails já usam este texto." };
}

/** Resends a failed e-mail: notifications are re-rendered to the same address; password resets get a new link. */
export async function resendMessage(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const profile = await requireAdmin();
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return fail("Envio inválido.");
  const admin = createAdminClient();
  const { data: row } = await admin.from("message_log").select("*").eq("id", id.data).maybeSingle();
  if (!row || row.channel !== "email" || row.status !== "failed") return fail("Só e-mails com falha podem ser reenviados.");

  if (row.kind === "password_reset") {
    const { error } = await admin.auth.resetPasswordForEmail(row.to_address);
    // The send_email hook logs the new message itself.
    if (error) {
      await logMessage({ channel: "email", kind: "resend", to: row.to_address, subject: row.subject, organizationId: row.organization_id, status: "failed", error: errorText(error.message) });
      return fail(`Não foi possível reenviar: ${error.message}`);
    }
  } else if (row.notification_id) {
    const { data: n } = await admin.from("notifications").select("organization_id, type, title, body, href").eq("id", row.notification_id).maybeSingle();
    if (!n) return fail("A notificação deste e-mail não existe mais.");
    const { data: org } = await admin.from("organizations").select("name").eq("id", n.organization_id).maybeSingle();
    const { subject, html, text } = await renderNotificationEmail(n, org?.name ?? "seu buffet");
    const sent = await sendLoggedEmail({ to: row.to_address, subject, html, text }, { kind: "resend", organizationId: n.organization_id, notificationId: row.notification_id });
    if (!sent.ok) return fail(`Falhou de novo: ${sent.error}`);
  } else {
    return fail("Este e-mail não pode ser reenviado.");
  }

  await logAdminAction(profile, "message.resend", { organizationId: row.organization_id, details: { message_id: row.id, to: row.to_address, kind: row.kind } });
  revalidatePath("/admin/emails");
  return { ok: true, message: "Reenviado." };
}

// ---------------------------------------------------------------------------------------------- avisos

const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Data inválida");
const announcementSchema = z.object({
  id: z.union([z.literal(""), uuid]).optional(),
  title: text(120),
  body: z.string().trim().max(1000, "Máximo de 1000 caracteres").default(""),
  tone: z.enum(["info", "success", "warning"]),
  audience: z.enum(["all", "basic", "premium"]),
  link_url: z.string().trim().max(500).optional().transform((v) => v || null)
    .refine((v) => v === null || v.startsWith("/") || /^https?:\/\//.test(v), "Use um caminho (/conta) ou um endereço https://"),
  link_label: z.string().trim().max(40).optional().transform((v) => v || null),
  starts_at: localDateTime,
  ends_at: z.union([z.literal(""), localDateTime]).optional(),
  send_email: z.string().optional(),
}).superRefine((d, ctx) => {
  if (d.ends_at && d.ends_at <= d.starts_at) ctx.addIssue({ code: "custom", path: ["ends_at"], message: "O fim deve ser depois do início" });
});

const toIso = (v: string) => localToIso(v.slice(0, 10), v.slice(11, 16));

/** Creates or edits an announcement; with send_email it also e-mails the owners right away. */
export async function saveAnnouncement(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const profile = await requireAdmin();
  const parsed = announcementSchema.safeParse(formToObject(formData));
  if (!parsed.success) return fail("Verifique os campos.", zodFieldErrors(parsed.error));
  const { id, send_email, starts_at, ends_at, ...rest } = parsed.data;
  const row = { ...rest, link_label: rest.link_url ? rest.link_label : null, starts_at: toIso(starts_at), ends_at: ends_at ? toIso(ends_at) : null };
  const admin = createAdminClient();

  let savedId = id || "";
  if (savedId) {
    const { error } = await admin.from("platform_announcements").update(row).eq("id", savedId);
    if (error) return fail(translateDbError(error));
    await logAdminAction(profile, "announcement.update", { details: { id: savedId, title: row.title } });
  } else {
    const { data, error } = await admin.from("platform_announcements").insert({ ...row, created_by: profile.id }).select("id").single();
    if (error) return fail(translateDbError(error));
    savedId = data.id;
    await logAdminAction(profile, "announcement.create", { details: { id: savedId, title: row.title, audience: row.audience } });
  }

  let message = "Aviso salvo.";
  if (send_email === "on") {
    const r = await emailOnce(profile, savedId);
    if (!r.ok) return fail(`Aviso salvo, mas o e-mail não saiu: ${r.error}`);
    message = `Aviso salvo e ${r.message}`;
  }
  revalidatePath("/admin/avisos");
  revalidatePath("/", "layout");
  if (id) redirect("/admin/avisos?saved=1");
  return { ok: true, message };
}

/** E-mails an existing announcement to the owners (once). */
export async function emailAnnouncement(_prev: ActionResult | undefined, formData: FormData): Promise<ActionResult> {
  const profile = await requireAdmin();
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return fail("Aviso inválido.");
  const r = await emailOnce(profile, id.data);
  revalidatePath("/admin/avisos");
  return r.ok ? { ok: true, message: r.message.charAt(0).toUpperCase() + r.message.slice(1) } : fail(r.error);
}

async function emailOnce(profile: { id: string; email: string }, id: string): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const admin = createAdminClient();
  // Claim first: a second click (or a second admin) finds emailed_at set and sends nothing.
  const { data: a } = await admin.from("platform_announcements").update({ emailed_at: new Date().toISOString() })
    .eq("id", id).is("emailed_at", null).select("title, body, audience, link_url").maybeSingle();
  if (!a) return { ok: false, error: "Este aviso já foi enviado por e-mail." };
  const recipients = await announcementRecipients(a.audience as "all" | "basic" | "premium");
  const { sent, failed } = await sendAnnouncementEmails(a, recipients);
  await logAdminAction(profile, "announcement.email", { details: { id, title: a.title, audience: a.audience, sent, failed } });
  return { ok: true, message: `enviado para ${sent} dono${sent === 1 ? "" : "s"}${failed ? ` (${failed} com falha, veja Envios)` : ""}.` };
}

/** Takes an announcement off the air now. */
export async function endAnnouncement(formData: FormData) {
  const profile = await requireAdmin();
  const id = uuid.safeParse(formData.get("id"));
  if (!id.success) return;
  const now = new Date().toISOString();
  const { data } = await createAdminClient().from("platform_announcements").update({ ends_at: now }).eq("id", id.data).or(`ends_at.is.null,ends_at.gt."${now}"`).select("title").maybeSingle();
  if (data) await logAdminAction(profile, "announcement.end", { details: { id: id.data, title: data.title } });
  revalidatePath("/admin/avisos");
  revalidatePath("/", "layout");
}
