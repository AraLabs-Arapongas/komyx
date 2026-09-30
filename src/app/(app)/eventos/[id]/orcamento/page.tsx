import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrganization } from "@/lib/data/session";
import { createQuoteAndGo, ensureQuoteLink, removeQuoteItem, addAddonToQuote } from "@/lib/actions/quotes";
import { PageBody, PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { eventTitle } from "@/components/events/event-card";
import { QUOTE_STATUS_LABEL, QUOTE_STATUS_TONE } from "@/lib/labels";
import { appUrl, formatCurrency, formatDate, formatTime, whatsappLink } from "@/lib/utils";
import { QuoteItemForm, DiscountForm, QuoteStatusForm, ShareQuote } from "./quote-forms";

export const metadata = { title: "Orçamento" };

export default async function QuotePage({ params, searchParams }: PageProps<"/eventos/[id]/orcamento">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const org = await getOrganization();
  const supabase = await createClient();

  const { data: event } = await supabase.from("events").select("id, title, starts_at, ends_at, status, estimated_participants, customers(name, whatsapp)").eq("id", id).maybeSingle();
  if (!event) notFound();

  const quoteId = typeof sp.quote === "string" ? sp.quote : null;
  const quoteQuery = supabase.from("quotes").select("*, quote_items(id, kind, description, quantity, unit_price, total, sort_order)").eq("event_id", id);
  const { data: quote } = quoteId ? await quoteQuery.eq("id", quoteId).maybeSingle() : await quoteQuery.order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!quote) {
    return (
      <>
        <PageHeader title="Orçamento" back={`/eventos/${id}`} />
        <PageBody>
          <form action={createQuoteAndGo}>
            <input type="hidden" name="event_id" value={id} />
            <button className={buttonClass("primary", "lg", "w-full")}>Montar orçamento</button>
          </form>
        </PageBody>
      </>
    );
  }
  if (!quoteId) redirect(`/eventos/${id}/orcamento?quote=${quote.id}`);

  const { data: addons } = await supabase.from("package_addons").select("id, name, price").eq("active", true).order("sort_order").order("name");
  const items = [...quote.quote_items].sort((a, b) => a.sort_order - b.sort_order);
  const locked = quote.status === "ACCEPTED" || quote.status === "REJECTED";
  const token = quote.status !== "DRAFT" ? await ensureQuoteLink(id) : null;
  const publicUrl = token ? appUrl(`/q/${token}`) : null;
  const customer = event.customers!;
  const message = `Olá ${customer.name.split(" ")[0]}! Segue o orçamento do ${org.name} para ${eventTitle(event)} em ${formatDate(event.starts_at)} às ${formatTime(event.starts_at)}: ${formatCurrency(quote.total)}.${publicUrl ? ` Veja os detalhes: ${publicUrl}` : ""}`;

  return (
    <>
      <PageHeader title="Orçamento" subtitle={eventTitle(event)} back={`/eventos/${id}`} action={<Badge tone={QUOTE_STATUS_TONE[quote.status]}>{QUOTE_STATUS_LABEL[quote.status]}</Badge>} />
      <PageBody>
        <Card>
          <CardHeader title="Itens" />
          <CardBody className="space-y-3">
            {items.length === 0 ? <p className="text-sm text-muted">Nenhum item. Adicione o pacote, adicionais ou itens livres.</p> : (
              <ul className="divide-y divide-border">
                {items.map((it) => (
                  <li key={it.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{it.description}</p>
                      <p className="text-xs text-muted">{Number(it.quantity)} × {formatCurrency(it.unit_price)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium whitespace-nowrap">{formatCurrency(it.total)}</span>
                      {!locked ? (
                        <form action={removeQuoteItem}>
                          <input type="hidden" name="id" value={it.id} />
                          <input type="hidden" name="event_id" value={id} />
                          <button className="text-xs text-muted hover:text-red-600">Remover</button>
                        </form>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="rounded-xl bg-stone-50 p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted">Subtotal</span><span>{formatCurrency(quote.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Desconto{quote.discount_type === "PERCENT" ? ` (${Number(quote.discount_value)}%)` : ""}</span><span>- {formatCurrency(quote.discount_total)}</span></div>
              <div className="flex justify-between text-base font-semibold pt-1 border-t border-border"><span>Total</span><span>{formatCurrency(quote.total)}</span></div>
            </div>
          </CardBody>
        </Card>

        {!locked ? (
          <>
            {addons && addons.length > 0 ? (
              <Card>
                <CardHeader title="Adicionais do catálogo" />
                <CardBody className="space-y-2">
                  {addons.map((a) => (
                    <form key={a.id} action={addAddonToQuote} className="flex items-center justify-between gap-2">
                      <input type="hidden" name="quote_id" value={quote.id} />
                      <input type="hidden" name="event_id" value={id} />
                      <input type="hidden" name="addon_id" value={a.id} />
                      <div className="min-w-0 flex-1"><p className="font-medium truncate">{a.name}</p><p className="text-xs text-muted">{formatCurrency(a.price)}</p></div>
                      <input name="quantity" type="number" min={1} defaultValue={1} className="h-9 w-16 rounded-lg border border-border px-2 text-sm" aria-label="Quantidade" />
                      <button className={buttonClass("secondary", "sm")}>Adicionar</button>
                    </form>
                  ))}
                </CardBody>
              </Card>
            ) : null}
            <Card>
              <CardHeader title="Item livre" />
              <CardBody><QuoteItemForm quoteId={quote.id} eventId={id} /></CardBody>
            </Card>
            <Card>
              <CardHeader title="Desconto e observações" />
              <CardBody><DiscountForm quoteId={quote.id} eventId={id} discountType={quote.discount_type} discountValue={Number(quote.discount_value)} notes={quote.notes ?? ""} /></CardBody>
            </Card>
          </>
        ) : quote.notes ? (
          <Card><CardHeader title="Observações" /><CardBody><p className="text-sm whitespace-pre-wrap">{quote.notes}</p></CardBody></Card>
        ) : null}

        <Card>
          <CardHeader title="Enviar e decidir" subtitle="Aceitar confirma o evento no mesmo registro." />
          <CardBody className="space-y-3">
            <QuoteStatusForm quoteId={quote.id} eventId={id} status={quote.status} />
            <ShareQuote publicUrl={publicUrl} whatsappUrl={whatsappLink(customer.whatsapp, message)} />
          </CardBody>
        </Card>

        <div className="pb-4">
          <Link href={`/eventos/${id}`} className={buttonClass("outline", "md", "w-full")}>Voltar ao evento</Link>
        </div>
      </PageBody>
    </>
  );
}
