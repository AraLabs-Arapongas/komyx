import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle, Plus, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrganization } from "@/lib/data/session";
import { PageBody, PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { eventTitle } from "@/components/events/event-card";
import { attachFinancials } from "@/lib/data/financials";
import { EVENT_STATUS_LABEL, EVENT_STATUS_TONE, type EventStatus } from "@/lib/labels";
import { formatDateLong, formatPhone, formatTime, whatsappLink } from "@/lib/utils";
import { CustomerDetails } from "./customer-details";

export async function generateMetadata({ params }: PageProps<"/clientes/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("customers").select("name").eq("id", id).maybeSingle();
  return { title: data?.name ?? "Cliente" };
}

export default async function CustomerPage({ params, searchParams }: PageProps<"/clientes/[id]">) {
  const [{ id }, sp, org] = await Promise.all([params, searchParams, getOrganization()]);
  const supabase = await createClient();
  const [{ data: customer }, { data: eventRows }] = await Promise.all([
    supabase.from("customers").select("id, name, whatsapp, email, notes, document, source, marketing_opt_in").eq("id", id).maybeSingle(),
    supabase.from("events").select("id, title, starts_at, ends_at, status, expires_at, adults, children, estimated_participants, customers(name, whatsapp)").eq("customer_id", id).order("starts_at", { ascending: false }).limit(100),
  ]);
  if (!customer) notFound();
  const events = await attachFinancials(supabase, eventRows);
  const now = new Date().getTime();
  const upcoming = [...events].filter((e) => new Date(e.ends_at).getTime() >= now && e.status !== "CANCELLED" && e.status !== "EXPIRED").sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const next = upcoming[0] ?? null;
  const history = events.filter((e) => e.id !== next?.id);
  const newQuoteHref = `/eventos/novo?status=QUOTE&customer=${id}`;

  return (
    <>
      <PageHeader title={customer.name} subtitle={`${formatPhone(customer.whatsapp)}${customer.email ? ` · ${customer.email}` : ""}`} back="/clientes" />
      <PageBody>
        <div className="flex flex-wrap gap-2">
          <a href={whatsappLink(customer.whatsapp, `Olá ${customer.name.split(" ")[0]}! Aqui é do ${org.name}.`)} target="_blank" rel="noopener" className={buttonClass("secondary", "md")}><MessageCircle className="h-4 w-4" /> WhatsApp</a>
          <Link href={newQuoteHref} className={buttonClass("primary", "md")}><Plus className="h-4 w-4" /> Novo orçamento</Link>
          <Link href={`/clientes/${id}?editar=1#dados`} className={buttonClass("outline", "md")}><Pencil className="h-4 w-4" /> Editar dados</Link>
        </div>

        <Card>
          <CardHeader title="Próximo evento" />
          <CardBody>
            {next ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium inline-flex items-center gap-2">{eventTitle(next)} <Badge tone={EVENT_STATUS_TONE[next.status as EventStatus]}>{EVENT_STATUS_LABEL[next.status as EventStatus]}</Badge></p>
                  <p className="text-sm text-muted">{formatDateLong(next.starts_at)} · {formatTime(next.starts_at)}–{formatTime(next.ends_at)}</p>
                  <p className="text-sm text-muted">{(next.adults ?? 0) + (next.children ?? 0) || next.estimated_participants || 0} participantes{next.event_financials ? (Number(next.event_financials.balance) > 0 ? <> · Falta receber <Money value={next.event_financials.balance} /></> : Number(next.event_financials.total) > 0 ? <> · Pago <Money value={next.event_financials.total} /></> : null) : null}</p>
                </div>
                <Link href={`/eventos/${next.id}`} className={buttonClass("outline", "sm")}>Abrir evento</Link>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted">Sem eventos futuros.</p>
                <Link href={newQuoteHref} className={buttonClass("primary", "sm")}><Plus className="h-4 w-4" /> Novo orçamento</Link>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Histórico de eventos" subtitle={`${events.length} registro${events.length === 1 ? "" : "s"}`} />
          <CardBody>
            {history.length === 0 ? <p className="text-sm text-muted">{next ? "Nenhum outro evento." : "Nenhum evento ainda."}</p> : (
              <ul className="divide-y divide-border">
                {history.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{eventTitle(e)}</p>
                      <p className="text-xs text-muted">
                        {formatDateLong(e.starts_at)} · {EVENT_STATUS_LABEL[e.status as EventStatus]}
                        {e.event_financials ? <> · {Number(e.event_financials.balance) > 0 ? <>falta <Money value={e.event_financials.balance} /></> : <Money value={e.event_financials.total} />}</> : null}
                      </p>
                    </div>
                    <Link href={`/eventos/${e.id}`} className={buttonClass("outline", "sm")}>Abrir evento</Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <CustomerDetails customer={customer} startEditing={sp.editar === "1"} />
      </PageBody>
    </>
  );
}
