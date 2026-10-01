import Link from "next/link";
import { CalendarDays, Plus, Inbox, FileText, Wallet, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data/session";
import { expirePreReservations } from "@/lib/actions/events";
import { attachFinancials } from "@/lib/data/financials";
import { getOrganization } from "@/lib/data/session";
import { Onboarding } from "@/components/home/onboarding";
import { appUrl } from "@/lib/utils";
import { PageBody, PageHeader, EmptyState, Alert } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { EventCard, eventTitle, type EventListItem } from "@/components/events/event-card";
import { formatCurrency, formatDateLong, formatDateTime, toDateKey } from "@/lib/utils";

export const metadata = { title: "Início" };

const EVENT_SELECT = "id, title, starts_at, ends_at, status, expires_at, estimated_participants, customers(name, whatsapp)";

export default async function HomePage({ searchParams }: PageProps<"/home">) {
  const sp = await searchParams;
  const [profile, org] = await Promise.all([requireProfile(), getOrganization()]);
  await expirePreReservations();
  const supabase = await createClient();

  const now = new Date();
  const todayKey = toDateKey(now);
  const startOfToday = new Date(`${todayKey}T00:00:00-03:00`).toISOString();
  const endOfToday = new Date(`${todayKey}T23:59:59-03:00`).toISOString();
  const in48h = new Date(now.getTime() + 48 * 3_600_000).toISOString();

  const [todayRes, upcomingRes, expiring, pendingQuotes, receivables, requests, onlinePending, pkgCount, photoCount, eventCount] = await Promise.all([
    supabase.from("events").select(EVENT_SELECT).gte("starts_at", startOfToday).lte("starts_at", endOfToday).in("status", ["CONFIRMED", "PRE_RESERVED"]).order("starts_at"),
    supabase.from("events").select(EVENT_SELECT).gt("starts_at", endOfToday).in("status", ["CONFIRMED", "PRE_RESERVED"]).order("starts_at").limit(5),
    supabase.from("events").select("id, title, expires_at, starts_at, customers(name)").eq("status", "PRE_RESERVED").lte("expires_at", in48h).order("expires_at").limit(5),
    supabase.from("quotes").select("id, status, total, event_id, events(id, title, starts_at, customers(name))").in("status", ["DRAFT", "SENT"]).order("created_at", { ascending: false }).limit(5),
    supabase.from("event_financials").select("event_id, balance, quote_total, paid_total").eq("organization_id", profile.organization_id).gt("balance", 0),
    supabase.from("public_requests").select("id", { count: "exact", head: true }).eq("status", "NEW"),
    supabase.from("events").select("id, title, starts_at, expires_at, pix_txid, customers(name, whatsapp)").eq("origin", "SELF_SERVICE").eq("status", "PRE_RESERVED").order("created_at", { ascending: false }).limit(5),
    supabase.from("packages").select("id", { count: "exact", head: true }),
    Promise.resolve({ count: Array.isArray(org.gallery) ? org.gallery.length : 0 }),
    supabase.from("events").select("id", { count: "exact", head: true }),
  ]);

  const [today, upcoming] = await Promise.all([attachFinancials(supabase, todayRes.data), attachFinancials(supabase, upcomingRes.data)]);
  const receivableTotal = (receivables.data ?? []).reduce((acc, r) => acc + Number(r.balance), 0);
  const newRequests = requests.count ?? 0;

  return (
    <>
      <PageHeader title={`Olá, ${profile.name.split(" ")[0]}`} subtitle={formatDateLong(now)} action={
        <Link href="/eventos/novo" className={buttonClass("primary", "sm")}><Plus className="h-4 w-4" /> Orçamento</Link>
      } />
      <PageBody>
        {sp.error === "forbidden" ? <Alert>Apenas o proprietário pode acessar essa área.</Alert> : null}
        <Onboarding isOwner={profile.role === "owner"} s={{ hasPackages: (pkgCount.count ?? 0) > 0, hasPix: Boolean(org.pix_key), hasPhotos: (photoCount.count ?? 0) > 0, hasWhatsapp: Boolean(org.whatsapp), hasEvent: (eventCount.count ?? 0) > 0, publicUrl: appUrl(`/p/${org.slug}`) }} />

        {onlinePending.data && onlinePending.data.length > 0 ? (
          <Card className="border-brand/40">
            <CardHeader title="Reservas online aguardando sinal" subtitle="Confira o Pix no extrato pelo código e confirme" />
            <CardBody className="space-y-2">
              {onlinePending.data.map((e) => (
                <Link key={e.id} href={`/eventos/${e.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{eventTitle(e)}</p>
                    <p className="text-xs text-muted">{formatDateLong(e.starts_at)} · código <b>{e.pix_txid}</b>{e.expires_at ? ` · até ${formatDateTime(e.expires_at)}` : ""}</p>
                  </div>
                  <span className="text-xs text-brand font-medium whitespace-nowrap">Confirmar</span>
                </Link>
              ))}
            </CardBody>
          </Card>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <Link href="/eventos?status=CONFIRMED" className="rounded-2xl bg-surface border border-border p-4">
            <p className="text-xs text-muted flex items-center gap-1"><Wallet className="h-3.5 w-3.5" /> A receber</p>
            <p className="text-xl font-semibold mt-1">{formatCurrency(receivableTotal)}</p>
            <p className="text-xs text-muted">{receivables.data?.length ?? 0} evento(s)</p>
          </Link>
          <Link href="/solicitacoes" className="rounded-2xl bg-surface border border-border p-4">
            <p className="text-xs text-muted flex items-center gap-1"><Inbox className="h-3.5 w-3.5" /> Solicitações</p>
            <p className="text-xl font-semibold mt-1">{newRequests}</p>
            <p className="text-xs text-muted">novas da página pública</p>
          </Link>
        </div>

        {expiring.data && expiring.data.length > 0 ? (
          <Card className="border-amber-200 bg-amber-50/60">
            <CardHeader title="Pré-reservas expirando" subtitle="Confirme ou renove antes do prazo" />
            <CardBody className="space-y-2">
              {expiring.data.map((e) => (
                <Link key={e.id} href={`/eventos/${e.id}`} className="flex items-center justify-between gap-3 rounded-xl bg-surface border border-border px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{eventTitle(e)}</p>
                    <p className="text-xs text-muted">Festa em {formatDateLong(e.starts_at)}</p>
                  </div>
                  <span className="text-xs text-amber-700 inline-flex items-center gap-1 whitespace-nowrap"><AlertTriangle className="h-3.5 w-3.5" /> {formatDateTime(e.expires_at!)}</span>
                </Link>
              ))}
            </CardBody>
          </Card>
        ) : null}

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Hoje</h2>
            <Link href="/agenda" className="text-sm text-brand font-medium inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" /> Agenda</Link>
          </div>
          {today.length > 0 ? (
            today.map((e) => <EventCard key={e.id} event={e as EventListItem} showDate={false} />)
          ) : (
            <EmptyState title="Nenhum evento hoje" description="Aproveite para adiantar orçamentos e contatos." />
          )}
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Próximos eventos</h2>
            <Link href="/eventos" className="text-sm text-brand font-medium">Ver todos</Link>
          </div>
          {upcoming.length > 0 ? (
            upcoming.map((e) => <EventCard key={e.id} event={e as EventListItem} />)
          ) : (
            <EmptyState title="Nada agendado" description="Crie um orçamento; se quiser, já reserve a data." action={<Link href="/eventos/novo" className={buttonClass("primary", "sm")}>Novo orçamento</Link>} />
          )}
        </section>

        {pendingQuotes.data && pendingQuotes.data.length > 0 ? (
          <Card>
            <CardHeader title="Orçamentos pendentes" subtitle="Rascunhos e enviados aguardando resposta" />
            <CardBody className="space-y-2">
              {pendingQuotes.data.map((q) => (
                <Link key={q.id} href={`/eventos/${q.event_id}/orcamento?quote=${q.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="font-medium truncate inline-flex items-center gap-1.5"><FileText className="h-4 w-4 text-muted" /> {q.events ? eventTitle(q.events) : "Evento"}</p>
                    <p className="text-xs text-muted">{q.status === "DRAFT" ? "Rascunho" : "Enviado"}{q.events ? ` · ${formatDateLong(q.events.starts_at)}` : ""}</p>
                  </div>
                  <span className="font-medium whitespace-nowrap">{formatCurrency(q.total)}</span>
                </Link>
              ))}
            </CardBody>
          </Card>
        ) : null}
      </PageBody>
    </>
  );
}
