import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { endAnnouncement } from "@/lib/actions/admin-messages";
import { announcementRecipients } from "@/lib/email/announcements";
import { PageBody, PageHeader, Alert } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PendingButton } from "@/components/ui/pending-button";
import { formatDateTime } from "@/lib/utils";
import { AnnouncementForm, EmailAnnouncementButton, type AnnouncementValues } from "./forms";

export const metadata = { title: "Avisos · Admin Komyx" };
export const dynamic = "force-dynamic";

const TONE = { info: { label: "informação", tone: "brand" }, success: { label: "novidade", tone: "green" }, warning: { label: "atenção", tone: "amber" } } as const;
const AUDIENCE: Record<string, string> = { all: "todos os buffets", basic: "plano básico", premium: "plano premium" };

function nowMs() {
  return Date.now();
}

type Row = AnnouncementValues & { id: string; emailed_at: string | null; created_at: string };

export default async function AdminAnnouncementsPage({ searchParams }: PageProps<"/admin/avisos">) {
  const sp = await searchParams;
  const admin = createAdminClient();
  const [{ data }, all, basic, premium] = await Promise.all([
    admin.from("platform_announcements").select("id, title, body, tone, audience, link_url, link_label, starts_at, ends_at, emailed_at, created_at").order("starts_at", { ascending: false }),
    announcementRecipients("all"),
    announcementRecipients("basic"),
    announcementRecipients("premium"),
  ]);
  const counts = { all: all.length, basic: basic.length, premium: premium.length };
  const rows = (data ?? []) as Row[];
  const now = nowMs();
  const at = (iso: string) => new Date(iso).getTime();
  const ended = (a: Row) => Boolean(a.ends_at && at(a.ends_at) <= now);
  const groups = [
    { title: "No ar", items: rows.filter((a) => at(a.starts_at) <= now && !ended(a)) },
    { title: "Agendados", items: rows.filter((a) => at(a.starts_at) > now && !ended(a)).reverse() },
    { title: "Encerrados", items: rows.filter(ended).slice(0, 30) },
  ];
  const editing = typeof sp.edit === "string" ? rows.find((a) => a.id === sp.edit) : undefined;

  return (
    <>
      <PageHeader title="Avisos" subtitle="Faixa no topo do app dos buffets, e e-mail opcional aos donos" />
      <PageBody className="space-y-4 max-w-4xl">
        {sp.saved ? <Alert tone="success">Aviso atualizado.</Alert> : null}
        <Card>
          <CardHeader title={editing ? "Editar aviso" : "Novo aviso"} subtitle="Aparece para a equipe dos buffets do público escolhido; cada pessoa pode fechar." action={editing ? <Link href="/admin/avisos" className="text-sm text-muted">Cancelar</Link> : null} />
          <CardBody><AnnouncementForm key={editing?.id ?? "new"} initial={editing} counts={counts} /></CardBody>
        </Card>
        {groups.map((g) => (
          <Card key={g.title}>
            <CardHeader title={`${g.title} · ${g.items.length}`} />
            <CardBody>
              {g.items.length ? (
                <ul className="divide-y divide-border">
                  {g.items.map((a) => {
                    const tone = TONE[a.tone as keyof typeof TONE] ?? TONE.info;
                    return (
                      <li key={a.id} className="py-3 space-y-1.5" data-testid="announcement-row">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium">{a.title}</p>
                            {a.body ? <p className="text-sm text-muted whitespace-pre-line">{a.body}</p> : null}
                          </div>
                          <div className="flex gap-1"><Badge tone={tone.tone}>{tone.label}</Badge><Badge>{AUDIENCE[a.audience] ?? a.audience}</Badge></div>
                        </div>
                        <p className="text-xs text-muted">
                          {formatDateTime(a.starts_at)} → {a.ends_at ? formatDateTime(a.ends_at) : "sem fim"}
                          {a.link_url ? ` · link ${a.link_url}` : ""}
                          {a.emailed_at ? ` · e-mail enviado ${formatDateTime(a.emailed_at)}` : ""}
                        </p>
                        {!ended(a) ? (
                          <div className="flex flex-wrap items-center gap-3 text-sm">
                            <Link href={`/admin/avisos?edit=${a.id}`} className="text-brand font-medium">Editar</Link>
                            <form action={endAnnouncement}><input type="hidden" name="id" value={a.id} /><PendingButton className="text-red-700 font-medium">Encerrar agora</PendingButton></form>
                            {!a.emailed_at ? <EmailAnnouncementButton id={a.id} count={counts[a.audience as keyof typeof counts] ?? 0} /> : null}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : <p className="text-sm text-muted">Nenhum.</p>}
            </CardBody>
          </Card>
        ))}
      </PageBody>
    </>
  );
}
