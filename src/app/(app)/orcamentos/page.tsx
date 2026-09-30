import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageBody, PageHeader, EmptyState } from "@/components/ui/page";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { eventTitle } from "@/components/events/event-card";
import { QUOTE_STATUS_LABEL, QUOTE_STATUS_TONE } from "@/lib/labels";
import { cn, formatCurrency, formatDateLong, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Orçamentos" };

const FILTERS = [["ALL", "Todos"], ["DRAFT", "Rascunhos"], ["SENT", "Enviados"], ["ACCEPTED", "Aceitos"], ["REJECTED", "Recusados"]] as const;

export default async function QuotesPage({ searchParams }: PageProps<"/orcamentos">) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "ALL";
  const supabase = await createClient();
  let query = supabase
    .from("quotes")
    .select("id, status, total, created_at, sent_at, event_id, adults, children, events(id, title, starts_at, status, customers(name))")
    .order("created_at", { ascending: false })
    .limit(200);
  if (status !== "ALL") query = query.eq("status", status as "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED");
  const [{ data: quotes }, { data: eventsWithoutQuote }] = await Promise.all([
    query,
    supabase.from("events").select("id, title, starts_at, customers(name), quotes(id)").in("status", ["PRE_RESERVED", "CONFIRMED"]).gte("starts_at", new Date().toISOString()).order("starts_at").limit(50),
  ]);
  const pending = (eventsWithoutQuote ?? []).filter((e) => !e.quotes || e.quotes.length === 0);
  const totals = (quotes ?? []).reduce((acc, q) => { acc[q.status] = (acc[q.status] ?? 0) + Number(q.total); return acc; }, {} as Record<string, number>);

  return (
    <>
      <PageHeader title="Orçamentos" subtitle="Todos os orçamentos do buffet" />
      <PageBody>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-2xl border border-border bg-surface p-3"><p className="text-xs text-muted">Enviados</p><p className="font-semibold">{formatCurrency(totals.SENT ?? 0)}</p></div>
          <div className="rounded-2xl border border-border bg-surface p-3"><p className="text-xs text-muted">Aceitos</p><p className="font-semibold text-emerald-700">{formatCurrency(totals.ACCEPTED ?? 0)}</p></div>
          <div className="rounded-2xl border border-border bg-surface p-3"><p className="text-xs text-muted">Recusados</p><p className="font-semibold text-red-700">{formatCurrency(totals.REJECTED ?? 0)}</p></div>
        </div>

        {pending.length > 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 space-y-2">
            <p className="font-medium text-sm">Eventos sem orçamento</p>
            {pending.slice(0, 5).map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{eventTitle(e)} · {formatDateLong(e.starts_at)}</span>
                <Link href={`/eventos/${e.id}/orcamento`} className={buttonClass("secondary", "sm")}><Plus className="h-4 w-4" /> Criar</Link>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
          {FILTERS.map(([k, l]) => (
            <Link key={k} href={`/orcamentos?status=${k}`} className={cn("whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium border", status === k ? "bg-brand text-brand-fg border-brand" : "bg-surface border-border text-muted")}>{l}</Link>
          ))}
        </div>

        {quotes && quotes.length > 0 ? (
          <ul className="rounded-2xl border border-border bg-surface divide-y divide-border overflow-hidden">
            {quotes.map((q) => (
              <li key={q.id}>
                <Link href={`/eventos/${q.event_id}/orcamento?quote=${q.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-stone-50">
                  <div className="min-w-0">
                    <p className="font-medium truncate inline-flex items-center gap-1.5"><FileText className="h-4 w-4 text-muted" /> {q.events ? eventTitle(q.events) : "Evento"}</p>
                    <p className="text-xs text-muted">{q.events?.customers?.name} · festa {q.events ? formatDateLong(q.events.starts_at) : ""} · {q.adults}A {q.children}C · criado {formatDateTime(q.created_at)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-medium">{formatCurrency(q.total)}</p>
                    <Badge tone={QUOTE_STATUS_TONE[q.status]}>{QUOTE_STATUS_LABEL[q.status]}</Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : <EmptyState title="Nenhum orçamento" description="Orçamentos são criados a partir de um evento ou pré-reserva." action={<Link href="/eventos/novo" className={buttonClass("primary", "sm")}>Nova pré-reserva</Link>} />}
      </PageBody>
    </>
  );
}
