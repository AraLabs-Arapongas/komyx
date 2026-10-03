import { notFound } from "next/navigation";
import { MessageCircle, Download } from "lucide-react";
import { installmentDueLabel } from "@/lib/contract";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadQuoteMenu } from "@/lib/data/menu";
import { MenuSummary } from "@/components/menu/menu-summary";
import { PublicFooter } from "@/components/public/public-footer";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { QUOTE_STATUS_LABEL, QUOTE_STATUS_TONE } from "@/lib/labels";
import { formatCurrency, formatDateLong, formatTime, whatsappLink } from "@/lib/utils";

export const metadata = { title: "Orçamento" };

export default async function PublicQuotePage({ params }: PageProps<"/q/[token]">) {
  const { token } = await params;
  if (token.length < 20) notFound();
  const admin = createAdminClient();
  const { data: link } = await admin
    .from("public_links")
    .select("event_id, events(title, starts_at, ends_at, adults, children, customers(name), organizations(name, whatsapp, logo_url, address, pix_key))")
    .eq("token", token)
    .eq("type", "QUOTE")
    .eq("active", true)
    .maybeSingle();
  if (!link?.events) notFound();
  const { data: quote } = await admin
    .from("quotes")
    .select("id, package_id, status, subtotal, discount_total, discount_type, discount_value, total, notes, sent_at, decided_at, quote_items(id, description, quantity, unit_price, total, sort_order), quote_installments(id, sequence, label, percent, amount, rule, days_before, due_date)")
    .eq("event_id", link.event_id)
    .neq("status", "DRAFT")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!quote) notFound();
  const menu = await loadQuoteMenu(admin, quote.id, quote.package_id);

  const ev = link.events;
  const org = ev.organizations!;
  const items = [...quote.quote_items].sort((a, b) => a.sort_order - b.sort_order);
  const installments = [...quote.quote_installments].sort((a, b) => a.sequence - b.sequence);
  const title = ev.title?.trim() || (ev.customers ? `Festa de ${ev.customers.name}` : "Festa");

  return (
    <main className="flex-1 flex flex-col">
      <div className="flex flex-col items-center px-4 py-10 flex-1">
      <div className="w-full max-w-md space-y-5">
        <header className="text-center space-y-2">
          {org.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logo_url} alt={org.name} className="mx-auto h-16 w-16 rounded-2xl object-cover border border-border" />
          ) : <div className="mx-auto h-16 w-16 rounded-2xl bg-brand text-brand-fg grid place-items-center text-2xl font-bold">{org.name[0]}</div>}
          <p className="text-sm text-muted">{org.name}</p>
          <h1 className="text-2xl font-semibold tracking-tight">Orçamento · {title}</h1>
          <p className="text-sm">{formatDateLong(ev.starts_at)} · {formatTime(ev.starts_at)}–{formatTime(ev.ends_at)}{ev.adults || ev.children ? ` · ${ev.adults ?? 0} adultos e ${ev.children ?? 0} crianças` : ""}</p>
          <Badge tone={QUOTE_STATUS_TONE[quote.status]}>{QUOTE_STATUS_LABEL[quote.status]}</Badge>
        </header>
        <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
          {menu.length ? <div className="rounded-xl bg-stone-50 p-3"><p className="text-sm font-semibold mb-1">Cardápio incluído</p><MenuSummary view={menu} /></div> : null}
          <ul className="divide-y divide-border">
            {items.map((it) => (
              <li key={it.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0"><p className="font-medium">{it.description}</p><p className="text-xs text-muted">{Number(it.quantity)} × {formatCurrency(it.unit_price)}</p></div>
                <span className="font-medium whitespace-nowrap">{formatCurrency(it.total)}</span>
              </li>
            ))}
          </ul>
          <div className="rounded-xl bg-stone-50 p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted">Subtotal</span><span>{formatCurrency(quote.subtotal)}</span></div>
            {Number(quote.discount_total) > 0 ? <div className="flex justify-between"><span className="text-muted">Desconto</span><span>- {formatCurrency(quote.discount_total)}</span></div> : null}
            <div className="flex justify-between text-lg font-semibold pt-1 border-t border-border"><span>Total</span><span>{formatCurrency(quote.total)}</span></div>
          </div>
          {installments.length ? (
            <div className="text-sm">
              <p className="font-medium mb-1">Forma de pagamento</p>
              <ul className="space-y-1">
                {installments.map((i, idx) => <li key={i.id} className="flex justify-between gap-3"><span className="text-muted">{idx + 1}. {i.label} ({Number(i.percent)}%) · {installmentDueLabel(i, ev.starts_at, quote.decided_at)}</span><span className="font-medium">{formatCurrency(i.amount)}</span></li>)}
              </ul>
              {org.pix_key ? <p className="text-xs text-muted mt-1">Chave Pix: {org.pix_key}</p> : null}
            </div>
          ) : null}
          {quote.notes ? <p className="text-sm whitespace-pre-wrap text-muted">{quote.notes}</p> : null}
          <a href={`/q/${token}/pdf`} className={buttonClass("outline", "md", "w-full")}><Download className="h-4 w-4" /> Baixar PDF</a>
          {org.whatsapp ? (
            <a href={whatsappLink(org.whatsapp, `Olá! Sobre o orçamento de ${title} (${formatCurrency(quote.total)}).`)} target="_blank" rel="noopener" className={buttonClass("primary", "lg", "w-full")}><MessageCircle className="h-5 w-5" /> Falar com o buffet</a>
          ) : null}
        </div>
              </div>
          </div>
      <PublicFooter variant="light" orgName={org.name} />
    </main>
  );
}
