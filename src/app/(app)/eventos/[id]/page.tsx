import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle, Pencil, FileText, Wallet, FileSignature, Image as ImageIcon, DoorOpen, Link2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrganization } from "@/lib/data/session";
import { createQuoteAndGo } from "@/lib/actions/quotes";
import { generateContractAndGo } from "@/lib/actions/contracts";
import { removePayment, removeEventExtra, ensureEventLink, revokePublicLink } from "@/lib/actions/guests-payments";
import { loadEventFinancials } from "@/lib/data/financials";
import { PageBody, PageHeader, Alert } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { eventTitle } from "@/components/events/event-card";
import { EVENT_STATUS_LABEL, EVENT_STATUS_TONE, QUOTE_STATUS_LABEL, QUOTE_STATUS_TONE, PAYMENT_STATUS_LABEL, PAYMENT_STATUS_TONE, PAYMENT_METHOD_LABEL } from "@/lib/labels";
import { formatCurrency, formatDate, formatDateLong, formatDateTime, formatPhone, formatTime, shortUrl, whatsappLink } from "@/lib/utils";
import { StatusActions } from "./status-actions";
import { GuestSection } from "./guest-section";
import { PaymentForm } from "./payment-form";
import { ExtraForm, InviteForm } from "./extra-forms";
import { CopyButton } from "@/components/ui/copy-button";
import { Installments } from "./installments";

const CONTRACT_LABEL: Record<string, string> = { DRAFT: "Rascunho", SENT: "Enviado", ACCEPTED: "Aceito", CANCELLED: "Cancelado" };
const CONTRACT_TONE: Record<string, "amber" | "green" | "slate" | "red" | "zinc"> = { DRAFT: "zinc", SENT: "amber", ACCEPTED: "green", CANCELLED: "red" };

export async function generateMetadata({ params }: PageProps<"/eventos/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("events").select("title, customers(name)").eq("id", id).maybeSingle();
  return { title: data ? eventTitle(data) : "Evento" };
}

function Stat({ label, children, strong }: { label: string; children: React.ReactNode; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p className={strong ? "text-lg font-semibold leading-tight" : "font-medium leading-tight"}>{children}</p>
    </div>
  );
}

/** Compact public-link row: truncated URL + copy + optional WhatsApp send + optional revoke. */
function LinkRow({ icon, label, url, send, revoke, generate }: {
  icon: React.ReactNode; label: string; url: string | null;
  send?: { href: string; label: string } | null;
  revoke?: { linkId: string; eventId: string } | null;
  generate: { eventId: string; type: string; label: string };
}) {
  return (
    <div className="rounded-xl border border-border bg-stone-50 px-3 py-2 text-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="font-medium inline-flex items-center gap-1.5 shrink-0">{icon} {label}</p>
        {url ? (
          <>
            <p className="text-xs text-muted truncate min-w-0 flex-1 basis-40">{url}</p>
            <div className="flex items-center gap-1.5 shrink-0">
              <CopyButton text={url} />
              {send ? <a href={send.href} target="_blank" rel="noopener" className={buttonClass("secondary", "sm")}><MessageCircle className="h-4 w-4" /> {send.label}</a> : null}
              {revoke ? <form action={revokePublicLink}><input type="hidden" name="id" value={revoke.linkId} /><input type="hidden" name="event_id" value={revoke.eventId} /><button className="h-9 px-2 text-xs text-muted hover:text-red-600">Revogar</button></form> : null}
            </div>
          </>
        ) : (
          <form action={ensureEventLink} className="ml-auto"><input type="hidden" name="event_id" value={generate.eventId} /><input type="hidden" name="type" value={generate.type} /><button className={buttonClass("secondary", "sm")}>{generate.label}</button></form>
        )}
      </div>
    </div>
  );
}

export default async function EventDetailPage({ params, searchParams }: PageProps<"/eventos/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const org = await getOrganization();
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("*, customers(id, name, whatsapp, email, document, source), packages(id, name)")
    .eq("id", id)
    .maybeSingle();
  if (!event) notFound();

  const [guestsRes, paymentsRes, linksRes, quotesRes, contractsRes, extrasRes, addonsRes, fin] = await Promise.all([
    supabase.from("guests").select("id, name, adults, children, participants, source, notes, checked_in_at, checked_in_adults, checked_in_children, created_at").eq("event_id", id).order("created_at"),
    supabase.from("payments").select("id, amount, paid_at, method, notes").eq("event_id", id).order("paid_at", { ascending: false }),
    supabase.from("public_links").select("id, token, short, type, active, created_at").eq("event_id", id).eq("active", true),
    supabase.from("quotes").select("id, status, total, created_at, decided_at, quote_installments(sequence, label, percent, amount, rule, days_before, due_date)").eq("event_id", id).order("created_at", { ascending: false }),
    supabase.from("contracts").select("id, number, status, created_at, accepted_at").eq("event_id", id).order("created_at", { ascending: false }),
    supabase.from("event_extras").select("id, description, quantity, unit_price, total, source, created_at").eq("event_id", id).order("created_at", { ascending: false }),
    supabase.from("package_addons").select("id, name, price").eq("active", true).order("sort_order").order("name"),
    loadEventFinancials(supabase, id),
  ]);

  const customer = event.customers!;
  const title = eventTitle(event);
  const link = (type: string) => (linksRes.data ?? []).find((l) => l.type === type);
  const guestLink = link("GUEST_CONFIRM");
  const inviteLink = link("INVITE_EDIT");
  const checkinLink = link("CHECKIN");
  const reservationLink = link("RESERVATION");
  const quotes = quotesRes.data ?? [];
  const latestQuote = quotes[0];
  const contracts = contractsRes.data ?? [];
  const latestContract = contracts[0];
  const payStatus = fin?.payment_status ?? null;
  const waMessage = `Olá ${customer.name.split(" ")[0]}! Aqui é do ${org.name}. Sobre a festa de ${formatDate(event.starts_at)} às ${formatTime(event.starts_at)}.`;
  const reservationUrl = reservationLink ? shortUrl(reservationLink.short) : null;
  const inviteUrl = inviteLink ? shortUrl(inviteLink.short) : null;
  const checkinUrl = checkinLink ? shortUrl(checkinLink.short) : null;

  const statusHint =
    event.status === "PRE_RESERVED" && event.expires_at ? `Data reservada até ${formatDateTime(event.expires_at)}. Confirme ou libere.` :
    event.status === "EXPIRED" ? "Horário liberado. Renove para bloquear novamente." :
    event.status === "QUOTE" ? "Só orçamento: a data não está bloqueada na agenda." : null;

  return (
    <>
      <PageHeader title={title} subtitle={`${formatDateLong(event.starts_at)} · ${formatTime(event.starts_at)}–${formatTime(event.ends_at)}`} back="/eventos"
        action={<Link href={`/eventos/${id}/editar`} className={buttonClass("ghost", "icon")} aria-label="Editar"><Pencil className="h-5 w-5" /></Link>} />
      <PageBody className="space-y-3">
        {sp.created === "QUOTE" ? <Alert tone="success">Orçamento criado. A data não está bloqueada; reserve quando o cliente sinalizar.</Alert> : null}
        {sp.created === "PRE_RESERVED" || sp.created === "1" ? <Alert tone="success">Orçamento criado e data reservada. O horário está bloqueado na agenda até o prazo.</Alert> : null}
        {sp.created === "CONFIRMED" ? <Alert tone="success">Orçamento criado e evento confirmado.</Alert> : null}
        {sp.error ? <Alert>{String(sp.error)}</Alert> : null}

        {/* Status strip: status + numbers + actions in one band */}
        <Card>
          <CardBody className="pt-3 pb-3 space-y-3">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <div className="min-w-0 flex-1 basis-56">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge tone={EVENT_STATUS_TONE[event.status]}>{EVENT_STATUS_LABEL[event.status]}</Badge>
                  {event.origin === "SELF_SERVICE" ? <Badge tone="brand">Reserva online</Badge> : null}
                  {payStatus ? <Badge tone={PAYMENT_STATUS_TONE[payStatus]}><Wallet className="h-3 w-3 mr-1" />{PAYMENT_STATUS_LABEL[payStatus]}</Badge> : null}
                </div>
                {statusHint ? <p className="text-xs text-muted mt-1.5">{statusHint}</p> : null}
              </div>
              <div className="grid grid-cols-5 gap-x-5 text-sm shrink-0">
                <Stat label="Orçamento"><Money value={fin?.quote_total ?? 0} /></Stat>
                <Stat label="Extras"><Money value={fin?.extras_total ?? 0} /></Stat>
                <Stat label="Pago"><Money value={fin?.paid_total ?? 0} /></Stat>
                <Stat label="Presentes">{fin?.checked_in_total ?? 0}/{fin?.participants_total ?? 0}</Stat>
                <Stat label="Saldo" strong><Money value={fin?.balance ?? 0} /></Stat>
              </div>
            </div>
            <StatusActions eventId={id} status={event.status} pixTxid={event.pix_txid} depositAmount={latestQuote ? Number([...latestQuote.quote_installments].sort((a, b) => a.sequence - b.sequence)[0]?.amount ?? 0) || null : null} />
          </CardBody>
        </Card>

        {/* Row: client · party data · documents */}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Card>
            <CardHeader title="Cliente" action={<Link href={`/clientes/${customer.id}`} className="text-sm text-brand font-medium">Ver ficha</Link>} />
            <CardBody className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{customer.name}</p>
                  <p className="text-sm text-muted truncate">{formatPhone(customer.whatsapp)}{customer.email ? ` · ${customer.email}` : ""}{customer.document ? ` · ${customer.document}` : ""}</p>
                </div>
                <a href={whatsappLink(customer.whatsapp, waMessage)} target="_blank" rel="noopener" className={buttonClass("secondary", "sm", "shrink-0")}>
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              </div>
              <LinkRow icon={<Link2 className="h-4 w-4" />} label="Página da reserva" url={reservationUrl}
                send={reservationUrl ? { href: whatsappLink(customer.whatsapp, `Sua reserva no ${org.name} (Pix, orçamento e contrato): ${reservationUrl}`), label: "Reenviar" } : null}
                generate={{ eventId: id, type: "RESERVATION", label: "Gerar página" }} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Dados da festa" />
            <CardBody>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                <div><dt className="text-muted text-xs">Data</dt><dd className="font-medium">{formatDate(event.starts_at)} · {formatTime(event.starts_at)}–{formatTime(event.ends_at)}</dd></div>
                <div><dt className="text-muted text-xs">Pacote</dt><dd className="font-medium">{event.packages?.name ?? "Personalizado"}</dd></div>
                <div><dt className="text-muted text-xs">Participantes</dt><dd className="font-medium">{event.adults ?? 0} adultos · {event.children ?? 0} crianças</dd></div>
                {event.celebrant_name ? <div><dt className="text-muted text-xs">Aniversariante</dt><dd className="font-medium">{event.celebrant_name}{event.celebrant_age != null ? `, ${event.celebrant_age} anos` : ""}</dd></div> : null}
                {event.space ? <div><dt className="text-muted text-xs">Espaço</dt><dd className="font-medium">{event.space}</dd></div> : null}
                {event.notes ? <div className="col-span-2"><dt className="text-muted text-xs">Observações</dt><dd className="whitespace-pre-wrap">{event.notes}</dd></div> : null}
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Documentos" />
            <CardBody className="space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium inline-flex items-center gap-1.5"><FileText className="h-4 w-4" /> Orçamento</p>
                  {latestQuote ? <Link href={`/eventos/${id}/orcamento?quote=${latestQuote.id}`} className="text-sm text-brand font-medium">Abrir</Link> : null}
                </div>
                {quotes.length === 0 ? (
                  <form action={createQuoteAndGo} className="mt-1.5 flex items-center justify-between gap-2">
                    <input type="hidden" name="event_id" value={id} />
                    <p className="text-xs text-muted">Parte do pacote e dos participantes.</p>
                    <button className={buttonClass("primary", "sm", "whitespace-nowrap")}>Montar orçamento</button>
                  </form>
                ) : (
                  <ul className="divide-y divide-border">
                    {quotes.map((q) => (
                      <li key={q.id}>
                        <Link href={`/eventos/${id}/orcamento?quote=${q.id}`} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                          <span className="inline-flex items-center gap-2"><Badge tone={QUOTE_STATUS_TONE[q.status]}>{QUOTE_STATUS_LABEL[q.status]}</Badge><span className="text-xs text-muted">{formatDateTime(q.created_at)}</span></span>
                          <span className="font-medium"><Money value={q.total} /></span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium inline-flex items-center gap-1.5"><FileSignature className="h-4 w-4" /> Contrato</p>
                  {latestContract ? <Link href={`/eventos/${id}/contrato?c=${latestContract.id}`} className="text-sm text-brand font-medium">Abrir</Link> : null}
                </div>
                {contracts.length > 0 ? (
                  <ul className="divide-y divide-border">
                    {contracts.map((c) => (
                      <li key={c.id}>
                        <Link href={`/eventos/${id}/contrato?c=${c.id}`} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                          <span className="min-w-0 truncate">Nº {c.number} <span className="text-xs text-muted">· {c.accepted_at ? `aceito ${formatDateTime(c.accepted_at)}` : formatDateTime(c.created_at)}</span></span>
                          <Badge tone={CONTRACT_TONE[c.status]}>{CONTRACT_LABEL[c.status]}</Badge>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <form action={generateContractAndGo} className="mt-1.5 flex items-center justify-between gap-2">
                  <input type="hidden" name="event_id" value={id} />
                  <p className="text-xs text-muted">{contracts.length ? "Preenchido com evento e orçamento." : "Preenchido automaticamente com evento e orçamento."}</p>
                  <button className={buttonClass(contracts.length ? "outline" : "primary", "sm", "whitespace-nowrap")}>{contracts.length ? "Nova versão" : "Gerar contrato"}</button>
                </form>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Row: payments · extras */}
        <div className="grid gap-3 xl:grid-cols-2">
          <Card>
            <CardHeader title="Pagamentos" subtitle={`Pago ${formatCurrency(fin?.paid_total ?? 0)} · falta receber ${formatCurrency(fin?.balance ?? 0)}`} />
            <CardBody className="space-y-3">
              {latestQuote && latestQuote.quote_installments.length > 0 ? (
                <div>
                  <p className="text-sm font-medium">Parcelas do orçamento</p>
                  <Installments eventId={id} installments={latestQuote.quote_installments} paidTotal={Number(fin?.paid_total ?? 0)} eventStartsAt={event.starts_at} acceptedAt={latestQuote.decided_at} />
                </div>
              ) : null}
              <p className="text-sm font-medium">Recebimentos</p>
              {(paymentsRes.data ?? []).length > 0 ? (
                <ul className="divide-y divide-border">
                  {paymentsRes.data!.map((p) => (
                    <li key={p.id} className="flex items-center justify-between py-1.5 gap-3 text-sm">
                      <div className="min-w-0 truncate">
                        <span className="font-medium"><Money value={p.amount} /></span> <span className="text-muted">· {PAYMENT_METHOD_LABEL[p.method]} · {formatDate(p.paid_at + "T12:00:00-03:00")}{p.notes ? ` · ${p.notes}` : ""}</span>
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

          <Card>
            <CardHeader title="Pedidos extras na festa" subtitle={`Somam ao saldo · ${formatCurrency(fin?.extras_total ?? 0)}`} />
            <CardBody className="space-y-3">
              {(extrasRes.data ?? []).length > 0 ? (
                <ul className="divide-y divide-border">
                  {extrasRes.data!.map((x) => (
                    <li key={x.id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                      <div className="min-w-0 truncate">
                        <span className="font-medium">{x.description}</span> <span className="text-muted">· {Number(x.quantity)} × {formatCurrency(x.unit_price)} · {x.source === "DOOR" ? "portaria" : "equipe"}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-medium whitespace-nowrap"><Money value={x.total} /></span>
                        <form action={removeEventExtra}><input type="hidden" name="id" value={x.id} /><input type="hidden" name="event_id" value={id} /><button className="text-xs text-muted hover:text-red-600">Remover</button></form>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted">Nenhum pedido extra.</p>}
              <ExtraForm eventId={id} addons={addonsRes.data ?? []} />
            </CardBody>
          </Card>
        </div>

        {/* Row: guests · invite */}
        <div className="grid gap-3 xl:grid-cols-2 pb-2">
          <Card>
            <CardHeader title="Convidados" subtitle={`${fin?.guest_count ?? 0} confirmação(ões) · ${fin?.adults_total ?? 0} adultos · ${fin?.children_total ?? 0} crianças · ${fin?.checked_in_total ?? 0} presentes`} />
            <CardBody className="space-y-3">
              <LinkRow icon={<DoorOpen className="h-4 w-4" />} label="Portaria (check-in no dia)" url={checkinUrl}
                revoke={checkinLink ? { linkId: checkinLink.id, eventId: id } : null}
                generate={{ eventId: id, type: "CHECKIN", label: "Gerar link da portaria" }} />
              {checkinLink ? <Link href={`/d/${checkinLink.token}`} target="_blank" className={buttonClass("outline", "sm")}><DoorOpen className="h-4 w-4" /> Abrir portaria</Link> : null}
              <GuestSection eventId={id} guests={guestsRes.data ?? []} guestLink={guestLink ? { id: guestLink.id, url: shortUrl(guestLink.short) } : null} eventTitle={title} customerPhone={customer.whatsapp} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Convite" subtitle="O cliente personaliza imagem e texto pelo link" />
            <CardBody className="space-y-3">
              <LinkRow icon={<ImageIcon className="h-4 w-4" />} label="Link de edição" url={inviteUrl}
                send={inviteUrl ? { href: whatsappLink(customer.whatsapp, `Personalize o convite da festa aqui: ${inviteUrl}`), label: "Enviar" } : null}
                revoke={inviteLink ? { linkId: inviteLink.id, eventId: id } : null}
                generate={{ eventId: id, type: "INVITE_EDIT", label: "Gerar link de edição" }} />
              <div className={event.invite_image_url ? "grid gap-3 sm:grid-cols-[160px_1fr]" : ""}>
                {event.invite_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={event.invite_image_url} alt="Convite" className="w-full max-h-48 object-contain rounded-xl border border-border bg-stone-50" />
                ) : null}
                <InviteForm eventId={id} title={event.invite_title ?? ""} message={event.invite_message ?? ""} />
              </div>
            </CardBody>
          </Card>
        </div>
      </PageBody>
    </>
  );
}
