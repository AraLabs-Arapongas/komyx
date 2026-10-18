import { redirect } from "next/navigation";
import { CreditCard, Mail, MessageCircle, PartyPopper, Inbox } from "lucide-react";
import { requireProfile } from "@/lib/data/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { buttonClass } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { CopyButton } from "@/components/ui/copy-button";
import { SUPPORT_WHATSAPP } from "@/lib/billing";
import { asaasConfigured, getPixQrCode } from "@/lib/billing/asaas";
import { billingDataMissing, brDate, HELP_EMAIL, lateState } from "@/lib/billing/plans";
import { formatCurrency, formatDate, formatTime, toDateKey, whatsappLink } from "@/lib/utils";
import { BillingDataForm } from "./data-form";

export const metadata = { title: "Acesso pausado" };
export const dynamic = "force-dynamic";

/** "Ana Souza" → "Ana S•••": enough to know a request arrived, not enough to call the client. */
function maskName(name: string) {
  const [first, second] = name.trim().split(/\s+/);
  return second ? `${first} ${second[0].toUpperCase()}•••` : `${first.slice(0, 3)}•••`;
}

/**
 * Day 10 of a late Komyx payment (docs/assinatura.md §4). The whole owner app lands here: requests that
 * arrived (masked) and how much they are worth, the upcoming parties (read-only: a promise to the client),
 * the payment, and help. Read with the service role after checking the profile's buffet is paused.
 */
export default async function PausedPage() {
  const profile = await requireProfile();
  const admin = createAdminClient();
  const orgId = profile.organization_id;
  const [{ data: org }, { data: bill }] = await Promise.all([
    admin.from("organizations").select("name, status, document, whatsapp").eq("id", orgId).single(),
    admin.from("organization_billing").select("status, due_at, paused_at").eq("organization_id", orgId).maybeSingle(),
  ]);
  if (!bill?.paused_at || org?.status !== "active") redirect("/home");

  const today = toDateKey(new Date());
  const [{ data: requests }, { data: events }, { data: open }] = await Promise.all([
    admin.from("public_requests").select("id, name, desired_date, participants, adults, children, estimated_total, created_at").eq("organization_id", orgId).eq("status", "NEW").order("created_at", { ascending: false }).limit(50),
    admin.from("events").select("id, starts_at, title, celebrant_name, adults, children, estimated_participants, customers(name)").eq("organization_id", orgId).in("status", ["CONFIRMED", "PRE_RESERVED"]).gte("starts_at", new Date().toISOString()).order("starts_at").limit(30),
    admin.from("billing_invoices").select("id, due_at, status, payment_url, amount, provider, external_id").eq("organization_id", orgId).eq("status", "open").order("due_at"),
  ]);
  const late = lateState(bill, open ?? [], today);
  const invoice = late?.invoice ? (open ?? []).find((i) => i.id === late.invoice!.id) ?? null : null;
  const isOwner = profile.role === "owner";
  const missing = org ? billingDataMissing(org) : [];
  const waiting = (requests ?? []).reduce((a, r) => a + Number(r.estimated_total ?? 0), 0);
  // Pix of the open charge when Asaas offers it; the payment page has every method anyway.
  const pix = isOwner && invoice?.provider === "asaas" && invoice.external_id && asaasConfigured() ? await getPixQrCode(invoice.external_id).catch(() => null) : null;
  const people = (r: { participants?: number | null; estimated_participants?: number | null; adults: number | null; children: number | null }) => r.participants ?? r.estimated_participants ?? ((r.adults ?? 0) + (r.children ?? 0) || null);

  return (
    <main className="flex-1 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-brand text-brand-fg grid place-items-center text-xl font-bold">K</div>
          <h1 className="text-2xl font-semibold">Seu acesso está pausado</h1>
          <p className="text-muted">
            {late ? `A mensalidade do Komyx que venceu em ${brDate(late.since)} não foi paga. ` : "A mensalidade do Komyx está em aberto. "}
            Sua página pública continua no ar e recebendo pedidos. Assim que o pagamento for confirmado, tudo volta sozinho.
          </p>
        </div>

        <section className="rounded-2xl border border-border bg-surface p-4 space-y-3" data-testid="paused-payment">
          <h2 className="font-semibold flex items-center gap-2"><CreditCard className="h-4 w-4 text-brand" /> Pagamento</h2>
          {!isOwner ? (
            <p className="text-sm text-muted">Avise o responsável pelo {org?.name}: ele vê aqui como pagar.</p>
          ) : invoice ? (
            <div className="space-y-3">
              <p className="text-sm">Fatura de <span className="font-semibold">{formatCurrency(invoice.amount)}</span>, vencida em {brDate(invoice.due_at)}.</p>
              {invoice.payment_url ? <a href={invoice.payment_url} target="_blank" rel="noopener" className={buttonClass("primary", "lg")}>Pagar agora · Pix, boleto ou cartão</a> : <p className="text-sm text-muted">Fale com a gente para receber os dados de pagamento.</p>}
              {pix?.payload ? (
                <div className="rounded-xl bg-stone-50 border border-border p-3 flex flex-col sm:flex-row gap-3 items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element -- inline base64 QR from Asaas */}
                  {pix.encodedImage ? <img src={`data:image/png;base64,${pix.encodedImage}`} alt="QR Code Pix da fatura" className="h-36 w-36" /> : null}
                  <div className="min-w-0 space-y-2 text-sm">
                    <p className="font-medium">Pix copia e cola</p>
                    <p className="text-xs text-muted break-all line-clamp-3">{pix.payload}</p>
                    <CopyButton text={pix.payload} label="Copiar código Pix" />
                  </div>
                </div>
              ) : null}
            </div>
          ) : missing.length ? (
            <div className="space-y-3">
              <p className="text-sm">Para gerar a cobrança, complete {missing.join(" e ")} do buffet:</p>
              <BillingDataForm document={org?.document ?? null} whatsapp={org?.whatsapp ?? null} />
            </div>
          ) : (
            <p className="text-sm text-muted">A cobrança aparece aqui em instantes. Se não aparecer, fale com a gente abaixo.</p>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-surface p-4 space-y-3" data-testid="paused-requests">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-semibold flex items-center gap-2"><Inbox className="h-4 w-4 text-brand" /> Pedidos esperando resposta</h2>
            {waiting > 0 ? <p className="text-sm"><span className="font-semibold">{formatCurrency(waiting)}</span> <span className="text-muted">em pedidos</span></p> : null}
          </div>
          {(requests ?? []).length ? (
            <ul className="divide-y divide-border text-sm">
              {requests!.map((r) => (
                <li key={r.id} className="py-2 flex items-center justify-between gap-3">
                  <span className="font-medium">{maskName(r.name)}</span>
                  <span className="text-muted text-right">{r.desired_date ? brDate(r.desired_date) : "data a combinar"}{people(r) ? ` · ${people(r)} pessoas` : ""}{r.estimated_total != null ? ` · ${formatCurrency(r.estimated_total)}` : ""}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">Nenhum pedido novo por enquanto.</p>}
          <p className="text-xs text-muted">Os detalhes e o contato dos clientes voltam quando o acesso for liberado.</p>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-4 space-y-3" data-testid="paused-events">
          <h2 className="font-semibold flex items-center gap-2"><PartyPopper className="h-4 w-4 text-brand" /> Próximas festas</h2>
          {(events ?? []).length ? (
            <ul className="divide-y divide-border text-sm">
              {events!.map((e) => (
                <li key={e.id} className="py-2 flex items-center justify-between gap-3">
                  <span className="min-w-0"><span className="font-medium">{e.title || (e.customers as { name: string } | null)?.name || e.celebrant_name || "Festa"}</span></span>
                  <span className="text-muted text-right whitespace-nowrap">{formatDate(e.starts_at)} · {formatTime(e.starts_at)}{people(e) ? ` · ${people(e)} convidados` : ""}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">Nenhuma festa marcada.</p>}
          <p className="text-xs text-muted">Só leitura. As festas continuam marcadas com os seus clientes.</p>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-4 space-y-2">
          <h2 className="font-semibold">Precisa de ajuda?</h2>
          <p className="text-sm text-muted">Fale com a gente pelo WhatsApp ou {HELP_EMAIL}.</p>
          <div className="flex flex-wrap gap-2">
            <a href={whatsappLink(SUPPORT_WHATSAPP, `Olá! Sou do ${org?.name} e meu acesso ao Komyx está pausado.`)} target="_blank" rel="noopener" className={buttonClass("outline", "sm")}><MessageCircle className="h-4 w-4" /> WhatsApp</a>
            <a href={`mailto:${HELP_EMAIL}`} className={buttonClass("outline", "sm")}><Mail className="h-4 w-4" /> {HELP_EMAIL}</a>
          </div>
        </section>

        <form action="/auth/signout" method="post" className="text-center"><PendingButton className="text-sm text-muted">Sair</PendingButton></form>
      </div>
    </main>
  );
}
