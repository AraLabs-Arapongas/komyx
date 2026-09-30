import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle, Pencil, FileText, Share2, Wallet, FileSignature, Image as ImageIcon, DoorOpen, Copy } from "lucide-react";
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
import { eventTitle } from "@/components/events/event-card";
import { EVENT_STATUS_LABEL, EVENT_STATUS_TONE, QUOTE_STATUS_LABEL, QUOTE_STATUS_TONE, PAYMENT_STATUS_LABEL, PAYMENT_STATUS_TONE, PAYMENT_METHOD_LABEL } from "@/lib/labels";
import { appUrl, formatCurrency, formatDate, formatDateLong, formatDateTime, formatPhone, formatTime, whatsappLink } from "@/lib/utils";
import { StatusActions } from "./status-actions";
import { GuestSection } from "./guest-section";
import { PaymentForm } from "./payment-form";
import { ExtraForm, InviteForm } from "./extra-forms";
import { CopyButton } from "@/components/ui/copy-button";

const CONTRACT_LABEL: Record<string, string> = { DRAFT: "Rascunho", SENT: "Enviado", ACCEPTED: "Aceito", CANCELLED: "Cancelado" };
const CONTRACT_TONE: Record<string, "amber" | "green" | "slate" | "red" | "zinc"> = { DRAFT: "zinc", SENT: "amber", ACCEPTED: "green", CANCELLED: "red" };

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
    .select("*, customers(id, name, whatsapp, email, document, source), packages(id, name)")
    .eq("id", id)
    .maybeSingle();
  if (!event) notFound();

  const [guestsRes, paymentsRes, linksRes, quotesRes, contractsRes, extrasRes, addonsRes, fin] = await Promise.all([
    supabase.from("guests").select("id, name, adults, children, participants, source, notes, checked_in_at, checked_in_adults, checked_in_children, created_at").eq("event_id", id).order("created_at"),
    supabase.from("payments").select("id, amount, paid_at, method, notes").eq("event_id", id).order("paid_at", { ascending: false }),
    supabase.from("public_links").select("id, token, type, active, created_at").eq("event_id", id).eq("active", true),
    supabase.from("quotes").select("id, status, total, created_at").eq("event_id", id).order("created_at", { ascending: false }),
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
  const quotes = quotesRes.data ?? [];
  const latestQuote = quotes[0];
  const contracts = contractsRes.data ?? [];
  const latestContract = contracts[0];
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
            <div className="mt-4 grid grid-cols-4 gap-2 text-center text-sm">
              <div className="rounded-xl bg-stone-50 p-2"><p className="text-xs text-muted">Orçamento</p><p className="font-medium">{formatCurrency(fin?.quote_total ?? 0)}</p></div>
              <div className="rounded-xl bg-stone-50 p-2"><p className="text-xs text-muted">Extras</p><p className="font-medium">{formatCurrency(fin?.extras_total ?? 0)}</p></div>
              <div className="rounded-xl bg-stone-50 p-2"><p className="text-xs text-muted">Pago</p><p className="font-medium">{formatCurrency(fin?.paid_total ?? 0)}</p></div>
              <div className="rounded-xl bg-stone-50 p-2"><p className="text-xs text-muted">Presentes</p><p className="font-medium">{fin?.checked_in_total ?? 0}/{fin?.participants_total ?? 0}</p></div>
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
              <p className="text-sm text-muted">{formatPhone(customer.whatsapp)}{customer.email ? ` · ${customer.email}` : ""}{customer.document ? ` · ${customer.document}` : ""}</p>
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
              <div><dt className="text-muted text-xs">Pacote</dt><dd className="font-medium">{event.packages?.name ?? "Personalizado"}</dd></div>
              <div><dt className="text-muted text-xs">Participantes</dt><dd className="font-medium">{event.adults ?? 0} adultos · {event.children ?? 0} crianças</dd></div>
              {event.celebrant_name ? <div><dt className="text-muted text-xs">Aniversariante</dt><dd className="font-medium">{event.celebrant_name}{event.celebrant_age != null ? `, ${event.celebrant_age} anos` : ""}</dd></div> : null}
              {event.space ? <div><dt className="text-muted text-xs">Espaço</dt><dd className="font-medium">{event.space}</dd></div> : null}
              {event.notes ? <div className="col-span-2"><dt className="text-muted text-xs">Observações</dt><dd className="whitespace-pre-wrap">{event.notes}</dd></div> : null}
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Orçamento" action={latestQuote ? <Link href={`/eventos/${id}/orcamento?quote=${latestQuote.id}`} className="text-sm text-brand font-medium">Abrir</Link> : null} />
          <CardBody className="space-y-3">
            {quotes.length === 0 ? (
              <>
                <p className="text-sm text-muted">Nenhum orçamento ainda. Ele parte do pacote e dos participantes.</p>
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
          <CardHeader title="Contrato" subtitle="Preenchido automaticamente com os dados do evento e do orçamento"
            action={latestContract ? <Link href={`/eventos/${id}/contrato?c=${latestContract.id}`} className="text-sm text-brand font-medium">Abrir</Link> : null} />
          <CardBody className="space-y-3">
            {contracts.length > 0 ? (
              <ul className="divide-y divide-border">
                {contracts.map((c) => (
                  <li key={c.id}>
                    <Link href={`/eventos/${id}/contrato?c=${c.id}`} className="flex items-center justify-between py-2.5">
                      <div>
                        <p className="font-medium">Contrato nº {c.number}</p>
                        <p className="text-xs text-muted">{c.accepted_at ? `Aceito em ${formatDateTime(c.accepted_at)}` : formatDateTime(c.created_at)}</p>
                      </div>
                      <Badge tone={CONTRACT_TONE[c.status]}>{CONTRACT_LABEL[c.status]}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">Nenhum contrato gerado.</p>}
            <form action={generateContractAndGo}>
              <input type="hidden" name="event_id" value={id} />
              <button className={buttonClass(contracts.length ? "outline" : "primary", "md", "w-full")}><FileSignature className="h-4 w-4" /> {contracts.length ? "Gerar nova versão" : "Gerar contrato"}</button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Convite" subtitle="O cliente pode personalizar com imagem e texto pelo link" />
          <CardBody className="space-y-3">
            {event.invite_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={event.invite_image_url} alt="Convite" className="w-full max-h-72 object-contain rounded-xl border border-border bg-stone-50" />
            ) : null}
            <InviteForm eventId={id} title={event.invite_title ?? ""} message={event.invite_message ?? ""} />
            <div className="rounded-xl border border-border bg-stone-50 p-3 space-y-2 text-sm">
              <p className="font-medium inline-flex items-center gap-1.5"><ImageIcon className="h-4 w-4" /> Link para o cliente editar o convite</p>
              {inviteLink ? (
                <>
                  <p className="text-xs text-muted break-all">{appUrl(`/i/${inviteLink.token}`)}</p>
                  <div className="flex flex-wrap gap-2">
                    <CopyButton text={appUrl(`/i/${inviteLink.token}`)} />
                    <a href={whatsappLink(customer.whatsapp, `Personalize o convite da festa aqui: ${appUrl(`/i/${inviteLink.token}`)}`)} target="_blank" rel="noopener" className={buttonClass("secondary", "sm")}><MessageCircle className="h-4 w-4" /> Enviar</a>
                    <form action={revokePublicLink}><input type="hidden" name="id" value={inviteLink.id} /><input type="hidden" name="event_id" value={id} /><button className="h-9 px-3 text-sm text-muted hover:text-red-600">Revogar</button></form>
                  </div>
                </>
              ) : (
                <form action={ensureEventLink}><input type="hidden" name="event_id" value={id} /><input type="hidden" name="type" value="INVITE_EDIT" /><button className={buttonClass("secondary", "sm")}>Gerar link de edição</button></form>
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Convidados" subtitle={`${fin?.guest_count ?? 0} confirmação(ões) · ${fin?.adults_total ?? 0} adultos · ${fin?.children_total ?? 0} crianças · ${fin?.checked_in_total ?? 0} presentes`} />
          <CardBody>
            <GuestSection eventId={id} guests={guestsRes.data ?? []} guestLink={guestLink ? { id: guestLink.id, url: appUrl(`/g/${guestLink.token}`) } : null} eventTitle={title} customerPhone={customer.whatsapp} />
            <div className="mt-4 rounded-xl border border-border bg-stone-50 p-3 space-y-2 text-sm">
              <p className="font-medium inline-flex items-center gap-1.5"><DoorOpen className="h-4 w-4" /> Portaria (check-in no dia)</p>
              <p className="text-xs text-muted">Quem estiver na porta marca chegadas por nome ou quantidade, adiciona convidado extra e registra pedidos na hora.</p>
              {checkinLink ? (
                <div className="flex flex-wrap gap-2 items-center">
                  <Link href={`/d/${checkinLink.token}`} target="_blank" className={buttonClass("primary", "sm")}><DoorOpen className="h-4 w-4" /> Abrir portaria</Link>
                  <CopyButton text={appUrl(`/d/${checkinLink.token}`)} />
                  <form action={revokePublicLink}><input type="hidden" name="id" value={checkinLink.id} /><input type="hidden" name="event_id" value={id} /><button className="h-9 px-3 text-sm text-muted hover:text-red-600">Revogar</button></form>
                </div>
              ) : (
                <form action={ensureEventLink}><input type="hidden" name="event_id" value={id} /><input type="hidden" name="type" value="CHECKIN" /><button className={buttonClass("secondary", "sm")}>Gerar link da portaria</button></form>
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Pedidos extras na festa" subtitle={`Somam ao saldo · ${formatCurrency(fin?.extras_total ?? 0)}`} />
          <CardBody className="space-y-4">
            {(extrasRes.data ?? []).length > 0 ? (
              <ul className="divide-y divide-border">
                {extrasRes.data!.map((x) => (
                  <li key={x.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{x.description}</p>
                      <p className="text-xs text-muted">{Number(x.quantity)} × {formatCurrency(x.unit_price)} · {x.source === "DOOR" ? "portaria" : "equipe"} · {formatDateTime(x.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium whitespace-nowrap">{formatCurrency(x.total)}</span>
                      <form action={removeEventExtra}><input type="hidden" name="id" value={x.id} /><input type="hidden" name="event_id" value={id} /><button className="text-xs text-muted hover:text-red-600">Remover</button></form>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">Nenhum pedido extra.</p>}
            <ExtraForm eventId={id} addons={addonsRes.data ?? []} />
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
            <span className={buttonClass("outline", "md", "opacity-50")}><Copy className="h-4 w-4" /> Enviar lista</span>
          )}
        </div>
      </PageBody>
    </>
  );
}
