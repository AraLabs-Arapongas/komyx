import { notFound } from "next/navigation";
import { CalendarDays, Download, MessageCircle, FileSignature } from "lucide-react";
import { loadReservation } from "@/lib/data/reservation";
import { PublicFooter } from "@/components/public/public-footer";
import { CopyButton } from "@/components/ui/copy-button";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { appUrl, formatCurrency, formatDateLong, formatDateTime, formatTime, whatsappLink } from "@/lib/utils";
import { installmentDueLabel } from "@/lib/contract";
import { allocateInstallments } from "@/lib/installments";
import { RememberReservation } from "./remember";

export const metadata = { title: "Minha reserva" };
export const dynamic = "force-dynamic";

export default async function ReservationPage({ params }: PageProps<"/r/[token]">) {
  const { token } = await params;
  const r = await loadReservation(token);
  if (!r) notFound();
  const { event: ev, org, quote } = r;
  const title = ev.title?.trim() || (ev.celebrant_name ? `Aniversário de ${ev.celebrant_name}` : ev.customers ? `Festa de ${ev.customers.name}` : "Sua festa");
  const expired = ev.status === "EXPIRED" || (ev.status === "PRE_RESERVED" && ev.expires_at && new Date(ev.expires_at) < new Date());
  const statusTone = ev.status === "CONFIRMED" ? "green" : expired ? "red" : ev.status === "CANCELLED" ? "red" : "amber";
  const statusLabel = ev.status === "CONFIRMED" ? "Confirmada" : ev.status === "CANCELLED" ? "Cancelada" : expired ? "Prazo expirado" : ev.status === "DONE" ? "Realizada" : "Reservada";
  const selfUrl = appUrl(`/r/${token}`);
  const waBuffet = org.whatsapp ? whatsappLink(org.whatsapp, `Olá! Sobre minha reserva ${ev.pix_txid ?? ""} de ${formatDateLong(ev.starts_at)}: ${selfUrl}`) : null;

  return (
    <main className="public-theme flex-1 flex flex-col">
      <RememberReservation token={token} date={ev.starts_at} org={org.name} />
      <div className="flex-1 mx-auto w-full max-w-2xl px-4 py-8 space-y-5">
        <header className="flex items-center gap-3">
          {org.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logo_url} alt="" className="h-12 w-12 rounded-full object-cover" />
          ) : <span className="h-12 w-12 rounded-full grid place-items-center font-bold display text-xl" style={{ background: "var(--sun)" }}>{org.name[0]}</span>}
          <div className="min-w-0">
            <p className="text-sm" style={{ color: "var(--muted-ink)" }}>{org.name}</p>
            <h1 className="display font-extrabold text-2xl leading-tight truncate">{title}</h1>
          </div>
          <Badge tone={statusTone} className="ml-auto">{statusLabel}</Badge>
        </header>

        <section className="rounded-3xl bg-white border p-5 space-y-2" style={{ borderColor: "#ece7dc" }}>
          <p className="inline-flex items-center gap-2 font-bold"><CalendarDays className="h-5 w-5" style={{ color: "var(--berry)" }} /> {formatDateLong(ev.starts_at)} · {formatTime(ev.starts_at)}–{formatTime(ev.ends_at)}</p>
          <p className="text-sm" style={{ color: "var(--muted-ink)" }}>{ev.adults ?? 0} adultos · {ev.children ?? 0} crianças{org.address ? ` · ${org.address}` : ""}</p>
          {ev.status === "PRE_RESERVED" && ev.expires_at && !expired ? <p className="text-sm">Data segura até <b>{formatDateTime(ev.expires_at)}</b>. Pague o sinal até lá para confirmar.</p> : null}
          {expired ? (
            <div className="text-sm text-red-700 space-y-2">
              <p>O prazo do sinal passou e a data voltou a ficar livre.</p>
              <a href={`/p/${org.slug}/orcamento`} className={buttonClass("primary", "sm")}>Tentar reservar de novo</a>
            </div>
          ) : null}
          {ev.status === "CONFIRMED" ? <p className="text-sm text-emerald-700">Sinal recebido. Sua festa está confirmada!</p> : null}
          <div className="flex flex-wrap gap-2 pt-1 text-xs items-center" style={{ color: "var(--muted-ink)" }}>
            <span>Link desta página:</span><span className="break-all">{selfUrl}</span><CopyButton text={selfUrl} label="Copiar" />
            <a href={`https://wa.me/?text=${encodeURIComponent(`Minha reserva no ${org.name}: ${selfUrl}`)}`} target="_blank" rel="noopener" className={buttonClass("outline", "sm")}><MessageCircle className="h-4 w-4" /> Enviar pra mim</a>
          </div>
        </section>

        {r.pixQr || r.pixPayload ? (
          <section className="rounded-3xl p-5 space-y-3" style={{ background: "var(--paper-2)" }}>
            <p className="display font-bold text-xl">Pagar o sinal{r.deposit != null && org.show_prices_public ? <> · <span style={{ color: "var(--berry)" }}>{formatCurrency(r.deposit)}</span></> : null}</p>
            <div className="grid gap-3 sm:grid-cols-[150px_1fr] sm:items-start">
              {r.pixQr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.pixQr} alt="QR Code Pix" className="h-[150px] w-[150px] rounded-xl bg-white p-1 border" style={{ borderColor: "#ece7dc" }} />
              ) : null}
              <div className="space-y-2 text-sm">
                <p>Pix para <b>{org.name}</b></p>
                <p className="flex flex-wrap items-center gap-2">Chave: <code className="rounded bg-white px-1.5 py-0.5">{org.pix_key}</code> <CopyButton text={org.pix_key!} label="Copiar chave" /></p>
                {r.pixPayload ? <p className="flex flex-wrap items-center gap-2">Pix copia e cola <CopyButton text={r.pixPayload} label="Copiar código" /></p> : null}
                <p className="text-xs rounded-lg px-2.5 py-1.5 bg-white">Código da reserva: <b>{ev.pix_txid}</b>. Vai no identificador do Pix; se pagar manualmente, escreva na descrição.</p>
                {waBuffet ? <a href={waBuffet} target="_blank" rel="noopener" className="inline-flex h-10 items-center gap-2 rounded-full px-4 font-extrabold text-white" style={{ background: "var(--berry)" }}><MessageCircle className="h-4 w-4" /> Enviar comprovante</a> : null}
              </div>
            </div>
          </section>
        ) : null}

        {quote ? (
          <section className="rounded-3xl bg-white border p-5 space-y-3" style={{ borderColor: "#ece7dc" }}>
            <div className="flex items-center justify-between gap-3">
              <p className="display font-bold text-xl">Orçamento</p>
              {r.quoteToken ? <a href={`/q/${r.quoteToken}/pdf`} className={buttonClass("outline", "sm")}><Download className="h-4 w-4" /> PDF</a> : null}
            </div>
            <ul className="divide-y text-sm" style={{ borderColor: "#ece7dc" }}>
              {quote.items.map((it, i) => <li key={i} className="flex justify-between gap-3 py-2"><span>{it.description}{Number(it.quantity) !== 1 ? ` × ${Number(it.quantity)}` : ""}</span>{org.show_prices_public ? <span className="font-bold">{formatCurrency(it.total)}</span> : null}</li>)}
            </ul>
            {org.show_prices_public ? <p className="flex justify-between text-lg font-extrabold border-t pt-2" style={{ borderColor: "#ece7dc" }}><span>Total</span><span>{formatCurrency(quote.total)}</span></p> : null}
            {quote.installments.length ? (
              <ol className="text-sm space-y-1">
                {allocateInstallments(quote.installments, r.paid, ev.starts_at, quote.decided_at).map((i, idx) => <li key={idx} className="flex justify-between gap-3"><span style={{ color: "var(--muted-ink)" }}>{idx + 1}. {i.label} · {installmentDueLabel(i, ev.starts_at, quote.decided_at)}{i.status === "PAID" ? <span className="ml-1 font-bold text-emerald-700">· paga ✓</span> : null}</span>{org.show_prices_public ? <span className="font-bold">{formatCurrency(i.amount)}</span> : null}</li>)}
              </ol>
            ) : null}
            {r.paid > 0 && org.show_prices_public ? <p className="text-sm text-emerald-700">Pago até agora: {formatCurrency(r.paid)}</p> : null}
          </section>
        ) : null}

        {r.contract ? (
          <section className="rounded-3xl bg-white border p-5 flex items-center justify-between gap-3" style={{ borderColor: "#ece7dc" }}>
            <div><p className="display font-bold text-xl">Contrato nº {r.contract.number}</p><p className="text-sm" style={{ color: "var(--muted-ink)" }}>{r.contract.status === "ACCEPTED" ? "Aceito" : "Aguardando seu aceite"}</p></div>
            <a href={`/c/${r.contract.token}`} className="inline-flex h-10 items-center gap-2 rounded-full px-4 font-extrabold text-white" style={{ background: "var(--ink)" }}><FileSignature className="h-4 w-4" /> {r.contract.status === "ACCEPTED" ? "Ver" : "Ler e aceitar"}</a>
          </section>
        ) : null}

        {waBuffet ? <a href={waBuffet} target="_blank" rel="noopener" className={buttonClass("secondary", "lg", "w-full")}><MessageCircle className="h-5 w-5" /> Falar com o buffet</a> : null}
      </div>
      <PublicFooter variant="light" orgName={org.name} />
    </main>
  );
}
