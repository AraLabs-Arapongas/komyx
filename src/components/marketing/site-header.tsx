import Link from "next/link";
import { KomyxMark } from "@/components/brand/komyx-logo";
import { AccountButton } from "@/components/marketing/account-button";

/** Komyx site header on dark backgrounds (landing, 404): logo + "Entrar" or the signed-in avatar. */
export function SiteHeader({ className = "max-w-5xl" }: { className?: string }) {
  return (
    <header className={`relative mx-auto w-full ${className} px-4 pt-6 flex items-center justify-between gap-3`}>
      <Link href="/" className="flex items-center gap-2.5" style={{ color: "var(--sun)" }}>
        <KomyxMark className="h-9 w-9" />
        <span className="leading-none"><span className="block display font-extrabold tracking-tight text-lg">Komyx</span><span className="block text-[11px] font-semibold mt-0.5" style={{ color: "#cfd2e6" }}>Gestão para buffets</span></span>
      </Link>
      {/* Only "Entrar" (or the signed-in avatar) here: the page's own CTA is the big one. */}
      <nav className="flex items-center gap-2">
        <AccountButton />
      </nav>
    </header>
  );
}
