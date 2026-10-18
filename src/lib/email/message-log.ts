import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEmailProvider, type Email } from "./index";

export type MessageKind = "notification" | "password_reset" | "sms_otp" | "announcement" | "resend" | "test" | "auth";
export type MessageMeta = { kind: MessageKind; organizationId?: string | null; notificationId?: string | null };

/** One message_log row (/admin/emails, /admin/saude). Never throws: logging must not break a send. */
export async function logMessage(row: MessageMeta & { channel: "email" | "sms"; to: string; subject?: string | null; status: "sent" | "failed" | "skipped"; error?: string | null }) {
  try {
    const { error } = await createAdminClient().from("message_log").insert({
      channel: row.channel,
      kind: row.kind,
      organization_id: row.organizationId ?? null,
      notification_id: row.notificationId ?? null,
      to_address: row.to,
      subject: row.subject ?? null,
      status: row.status,
      error: row.error ? row.error.slice(0, 1000) : null,
    });
    if (error) console.error("[message-log]", error.message);
  } catch (e) {
    console.error("[message-log]", e);
  }
}

export function errorText(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

/** Sends through the configured provider and logs the outcome. Returns the error instead of throwing. */
export async function sendLoggedEmail(email: Email, meta: MessageMeta): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await getEmailProvider().send(email);
    await logMessage({ ...meta, channel: "email", to: email.to, subject: email.subject, status: "sent" });
    return { ok: true };
  } catch (e) {
    const error = errorText(e);
    await logMessage({ ...meta, channel: "email", to: email.to, subject: email.subject, status: "failed", error });
    return { ok: false, error };
  }
}
