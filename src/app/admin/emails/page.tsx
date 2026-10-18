import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageBody, PageHeader, EmptyState } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DEFAULT_TEMPLATES, TEMPLATE_KEYS, isTemplateKey } from "@/lib/email/template-copy";
import { cn, formatDateTime } from "@/lib/utils";
import { LogFilters, ResendButton, TemplateEditor } from "./forms";

export const metadata = { title: "E-mails · Admin Komyx" };
export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = {
  notification: "Aviso à equipe",
  password_reset: "Senha",
  sms_otp: "Código SMS",
  announcement: "Aviso Komyx",
  resend: "Reenvio",
  test: "Teste",
  auth: "Auth",
};
const STATUS = { sent: { label: "enviado", tone: "green" }, failed: { label: "falhou", tone: "red" }, skipped: { label: "ignorado", tone: "zinc" } } as const;

function Tabs({ tab }: { tab: string }) {
  const item = (key: string, label: string) => (
    <Link href={`/admin/emails?tab=${key}`} className={cn("px-3 py-1.5 rounded-lg text-sm font-medium", tab === key ? "bg-stone-900 text-white" : "text-muted hover:bg-stone-100")}>{label}</Link>
  );
  return <nav className="flex gap-1">{item("modelos", "Modelos")}{item("envios", "Envios")}</nav>;
}

export default async function AdminEmailsPage({ searchParams }: PageProps<"/admin/emails">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  // ?status= links (from Saúde) land on Envios.
  const tab = one(sp.tab) === "modelos" || (!one(sp.tab) && !one(sp.status) && !one(sp.channel)) ? "modelos" : "envios";
  return (
    <>
      <PageHeader title="E-mails" subtitle={tab === "modelos" ? "Textos dos e-mails da plataforma" : "Últimos envios de e-mail e SMS"} />
      <PageBody className="space-y-4 max-w-5xl">
        <Tabs tab={tab} />
        {tab === "modelos" ? <Templates selected={one(sp.key)} /> : <Envios channel={one(sp.channel)} status={one(sp.status)} />}
      </PageBody>
    </>
  );
}

async function Templates({ selected }: { selected: string }) {
  const { data } = await createAdminClient().from("email_templates").select("*").order("key");
  const rows = new Map((data ?? []).map((t) => [t.key, t]));
  const key = isTemplateKey(selected) ? selected : TEMPLATE_KEYS[0];
  const d = DEFAULT_TEMPLATES[key];
  const row = rows.get(key);
  const current = { key, subject: row?.subject ?? d.subject, title: row?.title ?? d.title, intro: row?.intro ?? d.intro, button: row?.button ?? d.button, outro: row?.outro ?? d.outro };
  return (
    <div className="grid md:grid-cols-[240px_1fr] gap-4 items-start">
      <Card>
        <ul className="p-1.5">
          {TEMPLATE_KEYS.map((k) => (
            <li key={k}>
              <Link href={`/admin/emails?tab=modelos&key=${k}`} className={cn("block rounded-xl px-3 py-2", k === key ? "bg-brand-soft" : "hover:bg-stone-50")}>
                <p className={cn("text-sm font-medium", k === key && "text-brand")}>{rows.get(k)?.name ?? DEFAULT_TEMPLATES[k].name}</p>
                <p className="text-xs text-muted">{rows.get(k)?.updated_by ? `editado ${formatDateTime(rows.get(k)!.updated_at)}` : "texto padrão"}</p>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <CardHeader title={row?.name ?? d.name} subtitle={row?.description ?? d.description} />
        <CardBody>
          <TemplateEditor key={key} template={current} />
        </CardBody>
      </Card>
    </div>
  );
}

async function Envios({ channel, status }: { channel: string; status: string }) {
  const admin = createAdminClient();
  let q = admin.from("message_log").select("*").order("created_at", { ascending: false }).limit(200);
  if (channel === "email" || channel === "sms") q = q.eq("channel", channel);
  if (status in STATUS) q = q.eq("status", status);
  const { data } = await q;
  const rows = data ?? [];
  const orgIds = [...new Set(rows.map((r) => r.organization_id).filter((v): v is string => Boolean(v)))];
  const { data: orgs } = orgIds.length ? await admin.from("organizations").select("id, name").in("id", orgIds) : { data: [] };
  const orgName = new Map((orgs ?? []).map((o) => [o.id, o.name]));
  // A failed e-mail that went out later (resend or new reset link) does not offer the button again.
  const fixedLater = (r: (typeof rows)[number]) => rows.some((o) => o.created_at > r.created_at && o.status === "sent" && o.to_address === r.to_address
    && (r.kind === "password_reset" ? o.kind === "password_reset" : o.kind === "resend" && o.notification_id === r.notification_id));
  const canResend = (r: (typeof rows)[number]) => r.channel === "email" && r.status === "failed" && (r.kind === "password_reset" || Boolean(r.notification_id)) && !fixedLater(r);

  return (
    <Card>
      <CardHeader title={`Envios · ${rows.length}`} subtitle="Os 200 mais recentes. Em desenvolvimento nada sai de verdade: o envio aparece no log do servidor." action={<LogFilters channel={channel} status={status} />} />
      <CardBody>
        {rows.length ? (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.id} className="py-2.5 flex flex-wrap items-start justify-between gap-x-3 gap-y-1" data-testid="message-row">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{r.subject || "(sem assunto)"}</p>
                  <p className="text-xs text-muted truncate">
                    {formatDateTime(r.created_at)} · {r.channel === "sms" ? "SMS" : "E-mail"} · {KIND_LABEL[r.kind] ?? r.kind} · {r.to_address}
                    {r.organization_id ? <> · <Link href={`/admin/buffets/${r.organization_id}`} className="underline underline-offset-2">{orgName.get(r.organization_id) ?? "buffet"}</Link></> : null}
                  </p>
                  {r.error ? <p className="text-xs text-red-700 break-words mt-0.5">{r.error}</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  {canResend(r) ? <ResendButton id={r.id} /> : null}
                  <Badge tone={STATUS[r.status as keyof typeof STATUS]?.tone ?? "zinc"}>{STATUS[r.status as keyof typeof STATUS]?.label ?? r.status}</Badge>
                </div>
              </li>
            ))}
          </ul>
        ) : <EmptyState title="Nenhum envio" description="Nada com estes filtros." />}
      </CardBody>
    </Card>
  );
}
