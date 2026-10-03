import Link from "next/link";
import type { ReactNode } from "react";
import { publicFontClass } from "@/lib/fonts";
import { PublicFooter } from "@/components/public/public-footer";
import { KomyxLogo } from "@/components/brand/komyx-logo";

/** Shell for the legal/support pages: festive public theme, readable column, footer. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className={`${publicFontClass} public-theme font-festa flex-1 flex flex-col`}>
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12 flex-1">
        <Link href="/" className="inline-flex" aria-label="Komyx"><KomyxLogo markClassName="h-9 w-9" wordClassName="text-lg" /></Link>
        <h1 className="display mt-8 text-3xl sm:text-4xl font-black leading-tight">{title}</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--muted-ink)" }}>Última atualização: {updated}</p>
        <div className="legal mt-8 space-y-6 text-[15px] leading-relaxed">{children}</div>
      </div>
      <PublicFooter variant="light" cta={false} />
    </main>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="display text-xl font-extrabold">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
