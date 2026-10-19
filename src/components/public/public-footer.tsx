import Link from "next/link";
import { KomyxMark } from "@/components/brand/komyx-logo";
import { SUPPORT_WHATSAPP } from "@/lib/billing";
import { whatsappLink } from "@/lib/utils";

/**
 * Shared footer for every public page (landing, 404, buffet site, quote, contract, invite, door).
 * Komyx first, AraLabs as the small signature. Dark variant on ink pages, light on paper.
 * `cta` adds the thin "Tem um buffet?" strip above it (buffet pages); the landing turns it off.
 */
export function PublicFooter({ variant = "dark", orgName, cta = true }: { variant?: "dark" | "light"; orgName?: string; cta?: boolean }) {
  const dark = variant === "dark";
  const year = new Date().getFullYear();
  const strong = dark ? "#fff" : "var(--ink)";
  const soft = dark ? "#cfd2e6" : "var(--muted-ink)";
  const faint = dark ? "#8a8ea8" : "var(--muted-ink)";
  const line = dark ? "rgba(255,255,255,0.1)" : "rgba(27,31,58,0.1)";
  const link = "hover:underline underline-offset-4";
  const columns: { title: string; links: { label: string; href: string; external?: boolean }[] }[] = [
    { title: "Produto", links: [
      { label: "Testar 1 mês grátis", href: "/signup" },
      { label: "Ver uma página de buffet", href: "/p/komyx-buffet" },
      { label: "Entrar", href: "/login" },
    ] },
    { title: "Ajuda", links: [
      { label: "Suporte", href: "/suporte" },
      { label: "WhatsApp", href: whatsappLink(SUPPORT_WHATSAPP, "Olá! Preciso de ajuda com o Komyx."), external: true },
      { label: "contato@komyx.com.br", href: "mailto:contato@komyx.com.br", external: true },
    ] },
    { title: "Legal", links: [
      { label: "Privacidade", href: "/privacidade" },
      { label: "Termos de uso", href: "/termos" },
    ] },
  ];
  return (
    <footer className="public-theme" style={{ background: dark ? "var(--ink)" : "var(--paper)", color: soft, borderTop: `1px solid ${line}` }}>
      {cta ? (
        <div style={{ borderBottom: `1px solid ${line}` }}>
          <div className="mx-auto max-w-5xl px-4 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
            <p><span className="font-bold" style={{ color: strong }}>Tem um buffet?</span> Agenda, orçamento, contrato e convite em um só lugar.</p>
            <Link href="/signup" className="inline-flex h-10 shrink-0 items-center justify-center rounded-full px-4 font-extrabold text-white" style={{ background: "var(--berry)" }}>Criar meu buffet no Komyx</Link>
          </div>
        </div>
      ) : null}
      <div className="mx-auto max-w-5xl px-4 pt-10 pb-6">
        <div className="grid gap-8 sm:grid-cols-[1.3fr_repeat(3,1fr)]">
          <div className="space-y-2">
            <Link href="/" className="inline-flex items-center gap-2.5" style={{ color: "var(--sun)" }}>
              <KomyxMark className="h-9 w-9" />
              {/* Yellow reads on ink; on paper the name goes dark (the mark stays yellow). */}
              <span className="display font-extrabold tracking-tight text-lg" style={{ color: dark ? "var(--sun)" : "var(--ink)" }}>Komyx</span>
            </Link>
            <p className="text-sm max-w-xs">Gestão para buffets infantis e de eventos: orçamento, Pix, contrato e convite em um lugar só.</p>
          </div>
          {columns.map((c) => (
            <nav key={c.title} aria-label={c.title} className="space-y-2 text-sm">
              <p className="font-bold" style={{ color: strong }}>{c.title}</p>
              <ul className="space-y-1.5">
                {c.links.map((l) => (
                  <li key={l.label}>
                    {l.external
                      ? <a href={l.href} target={l.href.startsWith("http") ? "_blank" : undefined} rel="noopener" className={link}>{l.label}</a>
                      : <Link href={l.href} className={link}>{l.label}</Link>}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-10 pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs" style={{ borderTop: `1px solid ${line}`, color: faint }}>
          <p>© {year} {orgName ? `${orgName} · ` : ""}Komyx</p>
          <a href="https://aralabs.com.br" target="_blank" rel="noopener" className="inline-flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity" aria-label="Feito por AraLabs">
            <span>feito por</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dark ? "/aralabs/logo-mark-aralabs-white.svg" : "/aralabs/logo-mark-aralabs-dark.svg"} alt="" className="h-4 w-auto" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dark ? "/aralabs/logo-wordmark-aralabs-white.svg" : "/aralabs/logo-wordmark-aralabs-dark.svg"} alt="AraLabs" className="h-3 w-auto" />
          </a>
        </div>
      </div>
    </footer>
  );
}
