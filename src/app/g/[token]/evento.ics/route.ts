import { createAdminClient } from "@/lib/supabase/admin";

function icsDate(iso: string) {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}
function esc(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/** Calendar file for guests ("adicionar ao calendário"). */
export async function GET(_request: Request, { params }: RouteContext<"/g/[token]/evento.ics">) {
  const { token } = await params;
  if (token.length < 20) return new Response("Não encontrado", { status: 404 });
  const admin = createAdminClient();
  const { data: link } = await admin
    .from("public_links")
    .select("events(id, title, starts_at, ends_at, celebrant_name, invite_title, customers(name), organizations(name, address))")
    .eq("token", token)
    .eq("type", "GUEST_CONFIRM")
    .eq("active", true)
    .maybeSingle();
  const ev = link?.events;
  if (!ev?.organizations) return new Response("Não encontrado", { status: 404 });
  const title = ev.invite_title?.trim() || ev.title?.trim() || (ev.celebrant_name ? `Aniversário de ${ev.celebrant_name}` : ev.customers ? `Festa de ${ev.customers.name}` : "Festa");
  const body = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Komyx//PT", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:komyx-${ev.id}@komyx`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(ev.starts_at)}`,
    `DTEND:${icsDate(ev.ends_at)}`,
    `SUMMARY:${esc(title)}`,
    `LOCATION:${esc([ev.organizations.name, ev.organizations.address].filter(Boolean).join(" - "))}`,
    `DESCRIPTION:${esc(`Confirmação de presença: ${process.env.NEXT_PUBLIC_APP_URL ?? ""}/g/${token}`)}`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  return new Response(body, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="festa.ics"` } });
}
