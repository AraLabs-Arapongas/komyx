import Link from "next/link";

/**
 * Shared footer for every public page (buffet site, quote, contract, invite, door).
 * Dark variant sits on the ink background; light variant on paper.
 */
export function PublicFooter({ variant = "dark", orgName }: { variant?: "dark" | "light"; orgName?: string }) {
  const dark = variant === "dark";
  const year = new Date().getFullYear();
  return (
    <footer className={dark ? "public-theme" : "public-theme"} style={dark ? { background: "var(--ink)", color: "#cfd2e6" } : { background: "var(--paper)", color: "var(--muted-ink)" }}>
      <div className="mx-auto max-w-5xl px-4 py-10 grid gap-8 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="space-y-3">
          <a href="https://aralabs.com.br" target="_blank" rel="noopener" className="inline-flex items-center gap-3 group" aria-label="AraLabs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dark ? "/aralabs/logo-mark-aralabs-white.svg" : "/aralabs/logo-mark-aralabs-dark.svg"} alt="" className="h-9 w-auto opacity-90 group-hover:opacity-100 transition-opacity" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={dark ? "/aralabs/logo-wordmark-aralabs-white.svg" : "/aralabs/logo-wordmark-aralabs-dark.svg"} alt="AraLabs" className="h-6 w-auto opacity-90 group-hover:opacity-100 transition-opacity" />
          </a>
          <p className="text-sm max-w-md">
            Desenvolvido por <a href="https://aralabs.com.br" target="_blank" rel="noopener" className="font-bold underline-offset-4 hover:underline" style={{ color: dark ? "#fff" : "var(--ink)" }}>AraLabs</a>. Tecnologia simples para pequenos negócios que vivem de atendimento.
          </p>
          <p className="text-xs" style={{ color: dark ? "#8a8ea8" : "var(--muted-ink)" }}>© {year} {orgName ? `${orgName} · ` : ""}Festeja é um produto AraLabs.</p>
        </div>
        <div className="rounded-2xl p-4 text-sm" style={dark ? { background: "rgba(255,255,255,0.06)" } : { background: "var(--paper-2)" }}>
          <p className="font-bold" style={{ color: dark ? "#fff" : "var(--ink)" }}>Tem um buffet?</p>
          <p className="mt-0.5" style={{ color: dark ? "#cfd2e6" : "var(--muted-ink)" }}>Agenda, orçamento, contrato e convite em um só lugar.</p>
          <Link href="/signup" className="mt-3 inline-flex h-10 items-center justify-center rounded-full px-4 font-extrabold text-white" style={{ background: "var(--berry)" }}>Criar meu buffet no Festeja</Link>
        </div>
      </div>
    </footer>
  );
}
