import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { buttonEmail, getEmailProvider } from "@/lib/email";
import { appUrl } from "@/lib/utils";

// Same value the migration falls back to when Vault has no `notify_email_secret` (local only).
const LOCAL_SECRET = "komyx-local-notify-email-secret";

const COPY: Record<string, { subject: string; button: string }> = {
  request: { subject: "Novo pedido de orçamento", button: "Ver pedido" },
  reservation: { subject: "Nova reserva online", button: "Ver reserva" },
  contract_accepted: { subject: "Contrato aceito", button: "Ver contrato" },
  client_request: { subject: "Novo pedido do cliente", button: "Ver festa" },
};

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
  const body = n.body?.replace(/^\s*·\s*/, "").trim();
  const copy = COPY[n.type] ?? { subject: "Novo aviso", button: "Abrir no Komyx" };
  const { html, text } = buttonEmail({
    title: copy.subject,
    // The DB title repeats the subject for some kinds ("Novo pedido de orçamento: Ana"); keep the who.
    intro: `${n.title.replace(/^(Novo pedido de orçamento|Reserva online):\s*/, "")}${body ? ` · ${body}` : ""}.`,
    button: copy.button,
    url: appUrl(n.href ?? "/notificacoes"),
    outro: `Você recebe este aviso por fazer parte da equipe do ${buffet}. Para não receber mais, desligue em Minha conta.`,
  });

  const provider = getEmailProvider();
  const results = await Promise.allSettled(recipients.map((to) => provider.send({ to, subject: `${copy.subject} · ${buffet}`, html, text })));
  results.forEach((r, i) => { if (r.status === "rejected") console.error(`[notify-email] ${recipients[i]}`, r.reason); });
  return NextResponse.json({ sent: results.filter((r) => r.status === "fulfilled").length, failed: results.filter((r) => r.status === "rejected").length });
}
