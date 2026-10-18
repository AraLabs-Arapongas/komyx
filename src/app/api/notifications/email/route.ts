import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderNotificationEmail } from "@/lib/email/templates";
import { sendLoggedEmail } from "@/lib/email/message-log";

// Same value the migration falls back to when Vault has no `notify_email_secret` (local only).
const LOCAL_SECRET = "komyx-local-notify-email-secret";

function authorized(req: Request) {
  const secret = process.env.NOTIFY_EMAIL_SECRET || (process.env.NODE_ENV === "production" ? "" : LOCAL_SECRET);
  const a = Buffer.from(req.headers.get("authorization") ?? "");
  const b = Buffer.from(`Bearer ${secret}`);
  return Boolean(secret) && a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Called by Postgres (pg_net, trigger notifications_email) right after a notification is created.
 * Emails the org's owner and staff who did not opt out. Claims the row via emailed_at first, so a
 * repeated call is a no-op. Email failures are logged; the notification itself already exists.
 */
export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const supabase = createAdminClient();
  const { data: n } = await supabase.from("notifications").update({ emailed_at: new Date().toISOString() })
    .eq("id", id).is("emailed_at", null).select("organization_id, type, title, body, href").maybeSingle();
  if (!n) return NextResponse.json({ sent: 0, skipped: "already sent or not found" });

  const [{ data: org }, { data: people }] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", n.organization_id).single(),
    supabase.from("profiles").select("email").eq("organization_id", n.organization_id).eq("email_notifications", true),
  ]);
  const recipients = [...new Set((people ?? []).map((p) => p.email).filter(Boolean))];
  const buffet = org?.name ?? "seu buffet";
  const { subject, html, text } = await renderNotificationEmail(n, buffet);

  const results = await Promise.all(recipients.map((to) => sendLoggedEmail({ to, subject, html, text }, { kind: "notification", organizationId: n.organization_id, notificationId: id })));
  results.forEach((r, i) => { if (!r.ok) console.error(`[notify-email] ${recipients[i]}`, r.error); });
  return NextResponse.json({ sent: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length });
}
