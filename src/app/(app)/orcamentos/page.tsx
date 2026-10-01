import Link from "next/link";
import { FileText, MessageCircle, Plus, CalendarCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrganization } from "@/lib/data/session";
import { PageBody, PageHeader, EmptyState } from "@/components/ui/page";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { eventTitle } from "@/components/events/event-card";
import { appUrl, cn, formatDate, formatDateLong, formatDateTime, formatTime, toDateKey, whatsappLink } from "@/lib/utils";

export const metadata = { title: "Orçamentos" };

/** What the owner sees. "Enviado" is an action (sent_at), not a state: a sent quote is waiting for the client. */
type Visible = "DRAFT" | "WAITING" | "ACCEPTED" | "REJECTED" | "EXPIRED";
const VISIBLE_LABEL: Record<Visible, string> = { DRAFT: "Rascunho", WAITING: "Aguardando confirmação", ACCEPTED: "Aceito", REJECTED: "Recusado", EXPIRED: "Expirado" };
const CARD_LABEL: Record<Visible, string> = { DRAFT: "Rascunhos", WAITING: "Aguardando confirmação", ACCEPTED: "Aceitos", REJECTED: "Recusados", EXPIRED: "Expirados" };
const VISIBLE_TONE: Record<Visible, "zinc" | "amber" | "green" | "red"> = { DRAFT: "zinc", WAITING: "amber", ACCEPTED: "green", REJECTED: "red", EXPIRED: "zinc" };
const ORDER: Record<Visible, number> = { WAITING: 0, DRAFT: 1, ACCEPTED: 2, REJECTED: 3, EXPIRED: 4 };
const FILTERS: [string, string][] = [["ALL", "Todos"], ["DRAFT", "Rascunhos"], ["WAITING", "Aguardando confirmação"], ["ACCEPTED", "Aceitos"], ["REJECTED", "Recusados"], ["EXPIRED", "Expirados"]];

type Row = {
  id: string; status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED"; total: number | string; created_at: string; sent_at: string | null; event_id: string; adults: number; children: number;
  events: { id: string; title: string | null; starts_at: string; ends_at: string; status: string; expires_at: string | null; customers: { name: string; whatsapp: string } | null } | null;
};

function visible(q: Row): Visible {
  if (q.status === "DRAFT") return "DRAFT";
  if (q.status === "ACCEPTED") return "ACCEPTED";
  if (q.status === "REJECTED" || q.events?.status === "CANCELLED") return "REJECTED";
  if (q.events?.status === "EXPIRED") return "EXPIRED";
  return "WAITING";
}

export default async function QuotesPage({ searchParams }: PageProps<"/orcamentos">) {
  const sp = await searchParams;
  const filter = typeof sp.status === "string" && FILTERS.some(([k]) => k === sp.status) ? sp.status : "ALL";
  const [org, supabase] = await Promise.all([getOrganization(), createClient()]);

  const { data } = await supabase
    .from("quotes")
    .select("id, status, total, created_at, sent_at, event_id, adults, children, events(id, title, starts_at, ends_at, status, expires_at, customers(name, whatsapp))")
    .order("created_at", { ascending: false })
    .limit(300);
  const all = ((data ?? []) as unknown as Row[]).map((q) => ({ q, v: visible(q) }));

  // Links to put in the WhatsApp nudge (reservation page first, public quote second).
  const eventIds = all.map(({ q }) => q.event_id);
  const { data: links } = eventIds.length ? await supabase.from("public_links").select("event_id, type, token").in("event_id", eventIds).in("type", ["RESERVATION", "QUOTE"]).eq("active", true) : { data: [] as { event_id: string; type: string; token: string }[] };
  const linkFor = (eventId: string) => {
    const r = (links ?? []).find((l) => l.event_id === eventId && l.type === "RESERVATION");
    if (r) return appUrl(`/r/${r.token}`);
    const qlink = (links ?? []).find((l) => l.event_id === eventId && l.type === "QUOTE");
    return qlink ? appUrl(`/q/${qlink.token}`) : null;
  };

  // Top cards: current month, by creation date.
  const monthKey = toDateKey(new Date()).slice(0, 7);
  const month = all.filter(({ q }) => toDateKey(q.created_at).startsWith(monthKey));
  const sum = (v: Visible) => month.filter((x) => x.v === v).reduce((a, x) => a + Number(x.q.total), 0);
  const count = (v: Visible) => month.filter((x) => x.v === v).length;
  const monthRaw = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date());
  const monthLabel = monthRaw.charAt(0).toUpperCase() + monthRaw.slice(1);

  const rows = all
    .filter((x) => filter === "ALL" || x.v === filter)
    .sort((a, b) => {
      if (ORDER[a.v] !== ORDER[b.v]) return ORDER[a.v] - ORDER[b.v];
      if (a.v === "WAITING") {
        const ea = a.q.events?.expires_at ?? "9999", eb = b.q.events?.expires_at ?? "9999";
        if (ea !== eb) return ea < eb ? -1 : 1;
      }
      return a.q.created_at < b.q.created_at ? 1 : -1;
    });

  return (
    <>
      <PageHeader title="Orçamentos" subtitle="Propostas comerciais do buffet"
        action={<Link href="/eventos/novo?status=QUOTE" className={buttonClass("primary", "sm", "whitespace-nowrap")}><Plus className="h-4 w-4" /> Novo orçamento</Link>} />
      <PageBody>
        <div>
          <p className="text-xs text-muted mb-2">Mês atual · {monthLabel}</p>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            {(["WAITING", "ACCEPTED", "REJECTED"] as Visible[]).map((v) => (
              <div key={v} className="rounded-2xl border border-border bg-surface p-3">
                <p className="text-xs text-muted">{CARD_LABEL[v]}</p>
                <p className={cn("font-semibold", v === "ACCEPTED" && "text-emerald-700", v === "REJECTED" && "text-red-700")}><Money value={sum(v)} /></p>
                <p className="text-xs text-muted">{count(v)} orçamento{count(v) === 1 ? "" : "s"}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
          {FILTERS.map(([k, l]) => (
            <Link key={k} href={k === "ALL" ? "/orcamentos" : `/orcamentos?status=${k}`} className={cn("whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium border", filter === k ? "bg-brand text-brand-fg border-brand" : "bg-surface border-border text-muted")}>{l}</Link>
          ))}
        </div>

        {rows.length > 0 ? (
          <ul className="rounded-2xl border border-border bg-surface divide-y divide-border overflow-hidden">
            {rows.map(({ q, v }) => {
              const ev = q.events;
              const customer = ev?.customers;
              const quoteHref = `/eventos/${q.event_id}/orcamento?quote=${q.id}`;
              const reservedUntil = v === "WAITING" && ev?.status === "PRE_RESERVED" && ev.expires_at ? `Data reservada até ${formatDate(ev.expires_at, { day: "2-digit", month: "2-digit" })} às ${formatTime(ev.expires_at)}` : null;
              const url = linkFor(q.event_id);
              const nudge = customer ? whatsappLink(customer.whatsapp, `Olá ${customer.name.split(" ")[0]}! Aqui é do ${org.name}. Seu orçamento para a festa de ${ev ? formatDate(ev.starts_at) : ""} está aguardando sua confirmação.${url ? ` Veja aqui: ${url}` : ""}`) : null;
              return (
                <li key={q.id} className="px-4 py-3 hover:bg-stone-50">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                    <div className="min-w-0 flex-1 basis-64">
                      <Link href={quoteHref} className="font-medium truncate inline-flex items-center gap-1.5"><FileText className="h-4 w-4 text-muted shrink-0" /> {ev ? eventTitle(ev) : "Orçamento"}</Link>
                      <p className="text-xs text-muted truncate">{customer?.name}{ev ? ` · ${formatDateLong(ev.starts_at)} · ${formatTime(ev.starts_at)}–${formatTime(ev.ends_at)}` : ""} · {q.adults} adultos, {q.children} crianças</p>
                      <p className="text-xs text-muted">
                        {q.sent_at ? `Enviado ${formatDateTime(q.sent_at)}` : `Criado ${formatDateTime(q.created_at)}`}
                        {reservedUntil ? <span className="text-amber-700"> · {reservedUntil}</span> : null}
                        {v === "EXPIRED" ? <span> · Data liberada na agenda</span> : null}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-medium"><Money value={q.total} /></p>
                      <Badge tone={VISIBLE_TONE[v]}>{VISIBLE_LABEL[v]}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:basis-full sm:justify-end">
                      {v === "DRAFT" ? <Link href={quoteHref} className={buttonClass("secondary", "sm")}>Continuar orçamento</Link> : null}
                      {v === "WAITING" ? (
                        <>
                          {nudge ? <a href={nudge} target="_blank" rel="noopener" className={buttonClass("secondary", "sm")}><MessageCircle className="h-4 w-4" /> Cobrar no WhatsApp</a> : null}
                          <Link href={quoteHref} className={buttonClass("outline", "sm")}>Abrir orçamento</Link>
                        </>
                      ) : null}
                      {v === "ACCEPTED" ? <Link href={`/eventos/${q.event_id}`} className={buttonClass("outline", "sm")}><CalendarCheck className="h-4 w-4" /> Abrir evento</Link> : null}
                      {v === "REJECTED" || v === "EXPIRED" ? <Link href={quoteHref} className={buttonClass("outline", "sm")}>Abrir orçamento</Link> : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title="Nenhum orçamento" description={filter === "ALL" ? "Crie a primeira proposta: cliente, data, pacote e valor." : "Nada neste filtro."} action={filter === "ALL" ? <Link href="/eventos/novo?status=QUOTE" className={buttonClass("primary", "sm")}><Plus className="h-4 w-4" /> Novo orçamento</Link> : null} />
        )}
      </PageBody>
    </>
  );
}
