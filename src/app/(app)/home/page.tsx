import Link from "next/link";
import { CalendarDays, MessageCircle, AlertTriangle, Inbox, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, getOrganization } from "@/lib/data/session";
import { expirePreReservations } from "@/lib/actions/events";
import { loadFinancials } from "@/lib/data/financials";
import { Onboarding } from "@/components/home/onboarding";
import { PreReservationQuickActions } from "@/components/home/quick-actions";
import { PageBody, PageHeader, Alert } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { eventTitle } from "@/components/events/event-card";
import { EVENT_STATUS_LABEL, EVENT_STATUS_TONE } from "@/lib/labels";
import { appUrl, formatDateLong, formatDateTime, formatPhone, formatTime, toDateKey, whatsappLink } from "@/lib/utils";
import { leadSourceLabel } from "@/lib/pricing";

export const metadata = { title: "Início" };

const EVENT_SELECT = "id, title, starts_at, ends_at, status, expires_at, adults, children, estimated_participants, pix_txid, origin, customers(name, whatsapp)";

export default async function HomePage({ searchParams }: PageProps<"/home">) {
  const sp = await searchParams;
  const [profile, org] = await Promise.all([requireProfile(), getOrganization()]);
  await expirePreReservations();
  const supabase = await createClient();

  const now = new Date();
  const todayKey = toDateKey(now);
  const startOfToday = new Date(`${todayKey}T00:00:00-03:00`).toISOString();
  const endOfToday = new Date(`${todayKey}T23:59:59-03:00`).toISOString();
  const in7d = new Date(now.getTime() + 7 * 86_400_000).toISOString();
  const in48h = new Date(now.getTime() + 48 * 3_600_000).toISOString();

  const [todayRes, weekRes, expiringRes, onlineRes, requestsRes, pkgCount, eventCount, allFin] = await Promise.all([
    supabase.from("events").select(EVENT_SELECT).gte("starts_at", startOfToday).lte("starts_at", endOfToday).in("status", ["CONFIRMED", "PRE_RESERVED"]).order("starts_at"),
    supabase.from("events").select(EVENT_SELECT).gt("starts_at", endOfToday).lte("starts_at", in7d).in("status", ["CONFIRMED", "PRE_RESERVED"]).order("starts_at"),
    supabase.from("events").select(EVENT_SELECT).eq("status", "PRE_RESERVED").lte("expires_at", in48h).order("expires_at").limit(5),
    supabase.from("events").select(EVENT_SELECT).eq("origin", "SELF_SERVICE").eq("status", "PRE_RESERVED").order("created_at", { ascending: false }).limit(5),
    supabase.from("public_requests").select("id, name, whatsapp, desired_date, desired_time, adults, children, participants, source, estimated_total, message, created_at").eq("status", "NEW").order("created_at", { ascending: false }).limit(4),
    supabase.from("packages").select("id", { count: "exact", head: true }),
    supabase.from("events").select("id", { count: "exact", head: true }),
    supabase.from("event_financials").select("event_id, balance").eq("organization_id", profile.organization_id).gt("balance", 0),
  ]);

  const today = todayRes.data ?? [];
  const week = weekRes.data ?? [];
  const expiring = (expiringRes.data ?? []).filter((e) => !(onlineRes.data ?? []).some((o) => o.id === e.id));
  const online = onlineRes.data ?? [];
  const requests = requestsRes.data ?? [];
  const finMap = await loadFinancials(supabase, [...today, ...week].map((e) => e.id));

  // Receivables: overdue = past events still owing; week = events in the next 7 days; total
  const owingIds = (allFin.data ?? []).map((f) => f.event_id!).filter(Boolean);
  const { data: owingEvents } = owingIds.length ? await supabase.from("events").select("id, starts_at, status").in("id", owingIds).in("status", ["CONFIRMED", "DONE"]) : { data: [] };
  const balanceOf = new Map((allFin.data ?? []).map((f) => [f.event_id, Number(f.balance)]));
  const overdue = (owingEvents ?? []).filter((e) => e.starts_at < now.toISOString()).reduce((a, e) => a + (balanceOf.get(e.id) ?? 0), 0);
  const dueWeek = (owingEvents ?? []).filter((e) => e.starts_at >= now.toISOString() && e.starts_at <= in7d).reduce((a, e) => a + (balanceOf.get(e.id) ?? 0), 0);
  const receivableTotal = (owingEvents ?? []).reduce((a, e) => a + (balanceOf.get(e.id) ?? 0), 0);

  const urgentCount = expiring.length + online.length;
  const todayBalance = today.reduce((a, e) => a + Number(finMap.get(e.id)?.balance ?? 0), 0);

  return (
    <>
      <PageHeader title={`Olá, ${profile.name.split(" ")[0]}`} subtitle={formatDateLong(now)} />
      <PageBody>
        {sp.error === "forbidden" ? <Alert>Apenas o proprietário pode acessar essa área.</Alert> : null}
        <Onboarding isOwner={profile.role === "owner"} s={{ hasPackages: (pkgCount.count ?? 0) > 0, hasPix: Boolean(org.pix_key), hasPhotos: Array.isArray(org.gallery) && org.gallery.length > 0, hasWhatsapp: Boolean(org.whatsapp), hasEvent: (eventCount.count ?? 0) > 0, publicUrl: appUrl(`/p/${org.slug}`) }} />

        {/* HOJE: one line */}
        <p className="text-sm text-muted">
          <b className="text-foreground">Hoje:</b> {today.length} evento{today.length === 1 ? "" : "s"} · <Money value={todayBalance} /> a receber · {urgentCount} {urgentCount === 1 ? "ação urgente" : "ações urgentes"} · {requests.length} {requests.length === 1 ? "nova solicitação" : "novas solicitações"}
        </p>

        {/* AÇÕES URGENTES */}
        {expiring.length || online.length ? (
          <Card className="border-amber-200 bg-amber-50/60">
            <CardHeader title="Ação urgente" subtitle="Reservas aguardando confirmação: confirme ou libere a data" />
            <CardBody className="space-y-2">
              {online.map((e) => (
                <div key={e.id} className="rounded-xl bg-surface border border-border px-3 py-2.5 flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate"><Badge tone="brand" className="mr-1.5">Reserva online</Badge><Link href={`/eventos/${e.id}`} className="text-brand hover:underline underline-offset-4">{eventTitle(e)}</Link>{e.customers ? <span className="text-muted font-normal"> · {e.customers.name}</span> : null}</p>
                    <p className="text-xs text-muted">{formatDateLong(e.starts_at)} · aguardando sinal · código <b>{e.pix_txid}</b>{e.expires_at ? ` · até ${formatDateTime(e.expires_at)}` : ""}</p>
                  </div>
                  <Link href={`/eventos/${e.id}`} className={buttonClass("primary", "sm")}>Conferir Pix e confirmar</Link>
                </div>
              ))}
              {expiring.map((e) => (
                <div key={e.id} className="rounded-xl bg-surface border border-border px-3 py-2.5 flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate"><AlertTriangle className="inline h-4 w-4 text-amber-600 mr-1.5" /><Link href={`/eventos/${e.id}`} className="text-brand hover:underline underline-offset-4">{eventTitle(e)}</Link>{e.customers ? <span className="text-muted font-normal"> · {e.customers.name} · {formatPhone(e.customers.whatsapp)}</span> : null}</p>
                    <p className="text-xs text-muted">Reserva aguardando confirmação · data fica reservada até {e.expires_at && toDateKey(e.expires_at) === todayKey ? `hoje às ${formatTime(e.expires_at)}` : formatDateTime(e.expires_at!)} · festa {formatDateLong(e.starts_at)}</p>
                  </div>
                  <PreReservationQuickActions eventId={e.id} />
                </div>
              ))}
            </CardBody>
          </Card>
        ) : null}

        {/* NOVAS SOLICITAÇÕES */}
        {requests.length ? (
          <Card>
            <CardHeader title="Novas solicitações" subtitle="Pedidos de orçamento da página pública" action={<Link href="/solicitacoes" className="text-sm text-brand font-medium">Ver todas</Link>} />
            <CardBody className="divide-y divide-border">
              {requests.map((r) => (
                <div key={r.id} className="py-2.5 flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/solicitacoes?id=${r.id}`} className="font-medium truncate block text-brand hover:underline underline-offset-4"><Inbox className="inline h-4 w-4 mr-1.5" />{r.name}</Link>
                    {r.message ? <p className="text-sm truncate" title={r.message}>“{r.message}”</p> : null}
                    <p className="text-xs text-muted">
                      {r.desired_date ? `${r.desired_date.split("-").reverse().join("/")}${r.desired_time ? ` ${r.desired_time.slice(0, 5)}` : ""}` : "sem data"} · {r.adults != null || r.children != null ? `${r.adults ?? 0}A ${r.children ?? 0}C` : `${r.participants ?? "?"} pessoas`} · {leadSourceLabel(r.source)}{r.estimated_total != null ? ` · $<Money value={r.estimated_total} />` : ""} · {formatPhone(r.whatsapp)}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <a href={whatsappLink(r.whatsapp, `Olá ${r.name.split(" ")[0]}! Recebemos seu pedido de orçamento no ${org.name}.`)} target="_blank" rel="noopener" className={buttonClass("secondary", "sm")}><MessageCircle className="h-4 w-4" /> Responder</a>
                    <Link href={`/eventos/novo?request=${r.id}`} className={buttonClass("outline", "sm")}>Criar orçamento</Link>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        ) : null}

        {/* EVENTO DE HOJE */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{today.length === 1 ? "Evento de hoje" : "Eventos de hoje"}</h2>
            <Link href="/agenda" className="text-sm text-brand font-medium inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" /> Agenda</Link>
          </div>
          {today.length ? today.map((e) => {
            const f = finMap.get(e.id);
            return (
              <div key={e.id} className="rounded-2xl border border-border bg-surface p-4 flex flex-wrap items-center gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{eventTitle(e)} <Badge tone={EVENT_STATUS_TONE[e.status]} className="ml-1">{EVENT_STATUS_LABEL[e.status]}</Badge></p>
                  <p className="text-sm text-muted">{formatTime(e.starts_at)}–{formatTime(e.ends_at)} · {e.customers?.name}{e.customers ? ` · ${formatPhone(e.customers.whatsapp)}` : ""}</p>
                  <p className="text-sm text-muted">{f?.participants_total ?? 0} confirmados de {e.estimated_participants ?? 0} · {f?.checked_in_total ?? 0} presentes · saldo <b className={Number(f?.balance ?? 0) > 0 ? "text-amber-700" : "text-emerald-700"}><Money value={f?.balance ?? 0} /></b></p>
                </div>
                <div className="flex gap-1.5">
                  {e.customers ? <a href={whatsappLink(e.customers.whatsapp)} target="_blank" rel="noopener" className={buttonClass("secondary", "sm")}><MessageCircle className="h-4 w-4" /> WhatsApp</a> : null}
                  <Link href={`/eventos/${e.id}`} className={buttonClass("primary", "sm")}>Abrir evento <ArrowRight className="h-4 w-4" /></Link>
                </div>
              </div>
            );
          }) : <p className="text-sm text-muted rounded-2xl border border-dashed border-border px-4 py-5">Nenhum evento hoje.</p>}
        </section>

        {/* PRÓXIMOS 7 DIAS */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Próximos 7 dias <span className="text-muted font-normal text-sm">· {week.length} evento{week.length === 1 ? "" : "s"} · <Money value={dueWeek} /> a receber</span></h2>
            <Link href="/agenda?view=week" className="text-sm text-brand font-medium">Ver agenda</Link>
          </div>
          {week.length ? (
            <ul className="rounded-2xl border border-border bg-surface divide-y divide-border overflow-hidden">
              {week.slice(0, 3).map((e) => {
                const bal = Number(finMap.get(e.id)?.balance ?? 0);
                return (
                  <li key={e.id}>
                    <Link href={`/eventos/${e.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50">
                      <span className="text-xs font-mono text-muted w-28 shrink-0">{formatDateLong(e.starts_at)} {formatTime(e.starts_at)}</span>
                      <span className="font-medium truncate flex-1">{eventTitle(e)}</span>
                      {bal > 0 ? <span className="text-xs font-medium text-amber-700 whitespace-nowrap">cobrar <Money value={bal} /></span> : null}
                      <Badge tone={EVENT_STATUS_TONE[e.status]}>{EVENT_STATUS_LABEL[e.status]}</Badge>
                    </Link>
                  </li>
                );
              })}
              {week.length > 3 ? <li className="px-4 py-2 text-xs text-muted">+{week.length - 3} evento(s) · <Link href="/agenda?view=week" className="text-brand">ver agenda</Link></li> : null}
            </ul>
          ) : <p className="text-sm text-muted rounded-2xl border border-dashed border-border px-4 py-5">Nada nos próximos 7 dias.</p>}
        </section>

        {/* A RECEBER */}
        <section className="grid grid-cols-3 gap-2">
          <Link href="/eventos?status=DONE" className="rounded-2xl border border-border bg-surface p-3"><p className="text-xs text-muted">Atrasado</p><p className={`text-lg font-semibold ${overdue > 0 ? "text-red-700" : ""}`}><Money value={overdue} /></p><p className="text-[11px] text-muted">festas já realizadas</p></Link>
          <Link href="/agenda?view=week" className="rounded-2xl border border-border bg-surface p-3"><p className="text-xs text-muted">Próximos 7 dias</p><p className="text-lg font-semibold"><Money value={dueWeek} /></p><p className="text-[11px] text-muted">cobrar antes da festa</p></Link>
          <Link href="/eventos?status=CONFIRMED" className="rounded-2xl border border-border bg-surface p-3"><p className="text-xs text-muted">Total a receber</p><p className="text-lg font-semibold"><Money value={receivableTotal} /></p><p className="text-[11px] text-muted">{owingEvents?.length ?? 0} evento(s)</p></Link>
        </section>
      </PageBody>
    </>
  );
}
