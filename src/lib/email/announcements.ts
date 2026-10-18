import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/utils";
import { loadTemplate } from "./templates";
import { renderCopy } from "./template-copy";
import { sendLoggedEmail } from "./message-log";

export type Audience = "all" | "basic" | "premium";
export type Recipient = { email: string; organizationId: string; buffet: string };

/** Owners of active, real (not demo, not platform) buffets whose plan matches the audience. */
export async function announcementRecipients(audience: Audience): Promise<Recipient[]> {
  const admin = createAdminClient();
  let q = admin.from("organizations").select("id, name").eq("status", "active").eq("is_demo", false).neq("kind", "platform");
  if (audience !== "all") q = q.eq("plan", audience);
  const { data: orgs } = await q;
  if (!orgs?.length) return [];
  const names = new Map(orgs.map((o) => [o.id, o.name]));
  const { data: owners } = await admin.from("profiles").select("email, organization_id").eq("role", "owner").in("organization_id", [...names.keys()]);
  const seen = new Set<string>();
  return (owners ?? []).filter((o) => o.email && !seen.has(o.email) && seen.add(o.email))
    .map((o) => ({ email: o.email, organizationId: o.organization_id, buffet: names.get(o.organization_id) ?? "seu buffet" }));
}

/** Absolute URL for an announcement link (paths are inside the app). */
export function announcementUrl(link: string | null) {
  if (!link) return appUrl("/home");
  return link.startsWith("/") ? appUrl(link) : link;
}

/** Sends the announcement e-mail to every recipient (logged one by one). */
export async function sendAnnouncementEmails(a: { title: string; body: string; link_url: string | null }, recipients: Recipient[]) {
  const copy = await loadTemplate("announcement");
  let sent = 0;
  let failed = 0;
  // Small batches: Resend rate-limits bursts.
  for (let i = 0; i < recipients.length; i += 5) {
    const batch = recipients.slice(i, i + 5);
    const results = await Promise.all(batch.map((r) => {
      const { subject, html, text } = renderCopy(copy, { buffet: r.buffet, quem: a.title, detalhes: a.body, link: announcementUrl(a.link_url) });
      return sendLoggedEmail({ to: r.email, subject, html, text }, { kind: "announcement", organizationId: r.organizationId });
    }));
    for (const r of results) if (r.ok) sent++; else failed++;
  }
  return { sent, failed };
}
