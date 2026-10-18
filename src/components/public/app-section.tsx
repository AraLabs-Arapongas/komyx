import { Smartphone, Check } from "lucide-react";
import { APP_STORE_URL } from "@/lib/app-links";

/** Public buffet page: the Komyx app, for the buffet's clients to follow their party. */
export function AppSection({ buffet }: { buffet: string }) {
  const items = [
    "Orçamento, contrato e pagamentos da festa",
    "Pix do sinal e das parcelas na hora",
    "Lista de convidados e convite digital",
    "Pedidos ao buffet: mais pessoas, extras, mudanças",
  ];
  return (
    <section className="mx-auto max-w-5xl px-4 py-6">
      <div className="rounded-3xl p-6 sm:p-8 grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center" style={{ background: "var(--paper-2)" }}>
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-bold" style={{ color: "var(--berry)" }}><Smartphone className="h-4 w-4" /> App Komyx</p>
          <h2 className="display font-extrabold text-3xl sm:text-4xl mt-1">Sua festa no celular</h2>
          <p className="mt-2" style={{ color: "var(--muted-ink)" }}>Fechou com o {buffet}? Acompanhe tudo pelo app, entrando só com o seu WhatsApp.</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 text-sm">
            {items.map((t) => <li key={t} className="flex gap-2"><Check className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "var(--mint)" }} />{t}</li>)}
          </ul>
        </div>
        <div className="flex flex-col items-start sm:items-center gap-2">
          <a href={APP_STORE_URL} target="_blank" rel="noopener" className="inline-flex h-12 items-center gap-2 rounded-full px-6 font-extrabold text-white" style={{ background: "var(--ink)" }}>
            <Smartphone className="h-5 w-5" /> Baixar na App Store
          </a>
          <p className="text-xs" style={{ color: "var(--muted-ink)" }}>Para iPhone. No Android, use o link da sua reserva.</p>
        </div>
      </div>
    </section>
  );
}

/** Short version after the client sent the quote or reserved, and on the reservation page. */
export function AppCta({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 ${className}`} style={{ background: "var(--paper-2)" }}>
      <div className="min-w-0">
        <p className="display font-bold text-lg inline-flex items-center gap-2"><Smartphone className="h-5 w-5" style={{ color: "var(--berry)" }} /> Acompanhe pelo app Komyx</p>
        <p className="text-sm" style={{ color: "var(--muted-ink)" }}>Orçamento, contrato, Pix e convidados no celular. Entre com o seu WhatsApp.</p>
      </div>
      <a href={APP_STORE_URL} target="_blank" rel="noopener" className="inline-flex h-11 items-center gap-2 rounded-full px-5 font-extrabold text-white shrink-0" style={{ background: "var(--ink)" }}>Baixar na App Store</a>
    </div>
  );
}
