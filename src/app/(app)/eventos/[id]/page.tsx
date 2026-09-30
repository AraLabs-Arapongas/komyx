import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle, Pencil, FileText, Share2, Users, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrganization } from "@/lib/data/session";
import { createQuoteAndGo } from "@/lib/actions/quotes";
import { PageBody, PageHeader, Alert } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { eventTitle } from "@/components/events/event-card";
import { EVENT_STATUS_LABEL, EVENT_STATUS_TONE, QUOTE_STATUS_LABEL, QUOTE_STATUS_TONE, PAYMENT_STATUS_LABEL, PAYMENT_STATUS_TONE, PAYMENT_METHOD_LABEL } from "@/lib/labels";
import { appUrl, formatCurrency, formatDate, formatDateLong, formatDateTime, formatPhone, formatTime, whatsappLink } from "@/lib/utils";
import { StatusActions } from "./status-actions";
import { GuestSection } from "./guest-section";
import { PaymentForm } from "./payment-form";
import { removePayment } from "@/lib/actions/guests-payments";
import { loadEventFinancials } from "@/lib/data/financials";

export async function generateMetadata({ params }: PageProps<"/eventos/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("events").select("title, customers(name)").eq("id", id).maybeSingle();
  return { title: data ? eventTitle(data) : "Evento" };
}

export default async function EventDetailPage({ params, searchParams }: PageProps<"/eventos/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const org = await getOrganization();
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("*, customers(id, name, whatsapp, email), packages(id, name)")
    .eq("id", id)
    .maybeSingle();
  if (!event) notFound();

  const [guestsRes, paymentsRes, linksRes, quotesRes, fin] = await Promise.all([
    supabase.from("guests").select("id, name, participants, source, notes, created_at").eq("event_id", id).order("created_at"),
    supabase.from("payments").select("id, amount, paid_at, method, notes").eq("event_id", id).order("paid_at", { ascending: false }),
    supabase.from("public_links").select("id, token, type, active, created_at").eq("event_id", id).eq("active", true),
    supabase.from("quotes").select("id, status, total, created_at").eq("event_id", id).order("created_at", { ascending: false }),
    loadEventFinancials(supabase, id),
  ]);

  const customer = event.customers!;
  const title = eventTitle(event);
  const guestLink = (linksRes.data ?? []).find((l) => l.type === "GUEST_CONFIRM");
  const quotes = quotesRes.data ?? [];
  const latestQuote = quotes[0];
  const payStatus = fin?.payment_status ?? null;

  const waMessage = `Olá ${customer.name.split(" ")[0]}! Aqui é do ${org.name}. Sobre a festa de ${formatDate(event.starts_at)} às ${formatTime(event.starts_at)}.`;

  return (
    <>
      <PageHeader title={title} subtitle={`${formatDateLong(event.starts_at)} · ${formatTime(event.starts_at)}–${formatTime(event.ends_at)}`} back="/eventos"
        action={<Link href={`/eventos/${id}/editar`} className={buttonClass("ghost", "icon")} aria-label="Editar"><Pencil className="h-5 w-5" /></Link>} />
      <PageBody>
        {sp.created ? <Alert tone="success">Pré-reserva criada. O horário está bloqueado na agenda.</Alert> : null}
        {sp.error ? <Alert>{String(sp.error)}</Alert> : null}

        <Card>
          <CardBody className="pt-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Badge tone={EVENT_STATUS_TONE[event.status]}>{EVENT_STATUS_LABEL[event.status]}</Badge>
                {event.status === "PRE_RESERVED" && event.expires_at ? <p className="text-xs text-muted mt-2">Expira em {formatDateTime(event.expires_at)}</p> : null}
                {event.status === "EXPIRED" ? <p className="text-xs text-muted mt-2">Horário liberado. Renove para bloquear novamente.</p> : null}
              </div>
              <div className="text-right">
                <p className="text-xs text-muted">Saldo</p>
                <p className="text-lg font-semibold">{formatCurrency(fin?.balance ?? 0)}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-xl bg-stone-50 p-2"><p className="text-xs text-muted">Total</p><p className="font-medium">{formatCurrency(fin?.quote_total ?? 0)}</p></div>
              <div className="rounded-xl bg-stone-50 p-2"><p className="text-xs text-muted">Pago</p><p className="font-medium">{formatCurrency(fin?.paid_total ?? 0)}</p></div>
              <div className="rounded-xl bg-stone-50 p-2"><p className="text-xs text-muted">Convidados</p><p className="font-medium">{fin?.participants_total ?? 0}</p></div>
            </div>
            <div className="mt-4">
              <StatusActions eventId={id} status={event.status} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Cliente" action={<Link href={`/clientes/${customer.id}`} className="text-sm text-brand font-medium">Ver ficha</Link>} />
          <CardBody className="space-y-3">
            <div>
              <p className="font-medium">{customer.name}</p>
              <p className="text-sm text-muted">{formatPhone(customer.whatsapp)}{customer.email ? ` · ${customer.email}` : ""}</p>
            </div>
            <a href={whatsappLink(customer.whatsapp, waMessage)} target="_blank" rel="noopener" className={buttonClass("secondary", "md", "w-full")}>
              <MessageCircle className="h-4 w-4" /> Chamar no WhatsApp
            </a>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Dados da festa" />
          <CardBody>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div><dt className="text-muted text-xs">Data</dt><dd className="font-medium">{formatDate(event.starts_at)}</dd></div>
              <div><dt className="text-muted text-xs">Horário</dt><dd className="font-medium">{formatTime(event.starts_at)} – {formatTime(event.ends_at)}</dd></div>
              <div><dt className="text-muted text-xs">Pacote</dt><dd className="font-medium">{event.packages?.name ?? "—"}</dd></div>
              <div><dt className="text-muted text-xs">Participantes estimados</dt><dd className="font-medium">{event.estimated_participants ?? "—"}</dd></div>
              {event.space ? <div><dt className="text-muted text-xs">Espaço</dt><dd className="font-medium">{event.space}</dd></div> : null}
              {event.notes ? <div className="col-span-2"><dt className="text-muted text-xs">Observações</dt><dd className="whitespace-pre-wrap">{event.notes}</dd></div> : null}
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Orçamento" action={
            latestQuote ? <Link href={`/eventos/${id}/orcamento?quote=${latestQuote.id}`} className="text-sm text-brand font-medium">Abrir</Link> : null
          } />
          <CardBody className="space-y-3">
            {quotes.length === 0 ? (
              <>
                <p className="text-sm text-muted">Nenhum orçamento ainda. Ele parte do pacote e participantes estimados.</p>
                <form action={createQuoteAndGo}>
                  <input type="hidden" name="event_id" value={id} />
                  <button className={buttonClass("primary", "md", "w-full")}><FileText className="h-4 w-4" /> Montar orçamento</button>
                </form>
              </>
            ) : (
              <ul className="divide-y divide-border">
                {quotes.map((q) => (
                  <li key={q.id}>
                    <Link href={`/eventos/${id}/orcamento?quote=${q.id}`} className="flex items-center justify-between py-2.5">
                      <div>
                        <Badge tone={QUOTE_STATUS_TONE[q.status]}>{QUOTE_STATUS_LABEL[q.status]}</Badge>
                        <p className="text-xs text-muted mt-1">{formatDateTime(q.created_at)}</p>
                      </div>
                      <span className="font-medium">{formatCurrency(q.total)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Convidados" subtitle={`${fin?.guest_count ?? 0} confirmação(ões) · ${fin?.participants_total ?? 0} pessoas`} />
          <CardBody>
            <GuestSection eventId={id} guests={guestsRes.data ?? []} guestLink={guestLink ? { id: guestLink.id, url: appUrl(`/g/${guestLink.token}`) } : null} eventTitle={title} customerPhone={customer.whatsapp} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Pagamentos" subtitle="Total pago é a soma dos registros"
            action={payStatus ? <Badge tone={PAYMENT_STATUS_TONE[payStatus]}><Wallet className="h-3 w-3 mr-1" />{PAYMENT_STATUS_LABEL[payStatus]}</Badge> : null} />
          <CardBody className="space-y-4">
            {(paymentsRes.data ?? []).length > 0 ? (
              <ul className="divide-y divide-border">
                {paymentsRes.data!.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2.5 gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{formatCurrency(p.amount)} <span className="text-muted font-normal text-sm">· {PAYMENT_METHOD_LABEL[p.method]}</span></p>
                      <p className="text-xs text-muted">{formatDate(p.paid_at + "T12:00:00-03:00")}{p.notes ? ` · ${p.notes}` : ""}</p>
                    </div>
                    <form action={removePayment}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="event_id" value={id} />
                      <button className="text-xs text-muted hover:text-red-600">Remover</button>
                    </form>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">Nenhum pagamento registrado.</p>}
            <PaymentForm eventId={id} />
          </CardBody>
        </Card>

        <div className="grid grid-cols-2 gap-2 pb-4">
          <Link href={`/eventos/${id}/editar`} className={buttonClass("outline", "md")}><Pencil className="h-4 w-4" /> Editar</Link>
          {guestLink ? (
            <a href={whatsappLink(customer.whatsapp, `Lista de convidados da festa: ${appUrl(`/g/${guestLink.token}`)}`)} target="_blank" rel="noopener" className={buttonClass("outline", "md")}><Share2 className="h-4 w-4" /> Enviar lista</a>
          ) : (
            <span className={buttonClass("outline", "md", "opacity-50")}><Users className="h-4 w-4" /> Enviar lista</span>
          )}
        </div>
      </PageBody>
    </>
  );
}
