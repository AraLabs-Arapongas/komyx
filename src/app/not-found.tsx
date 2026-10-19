import Link from "next/link";
import { publicFontClass } from "@/lib/fonts";
import { PublicFooter } from "@/components/public/public-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { PartyScene } from "@/components/marketing/party-scene";

export const metadata = { title: "Página não encontrada", robots: { index: false } };

/**
 * 404 for unknown addresses and for notFound() (a buffet slug that doesn't exist, an expired or
 * mistyped party/guest/contract link). Most people landing here came from a link someone sent them.
 */
export default function NotFound() {
  return (
    <main className={`${publicFontClass} public-theme font-festa flex-1 flex flex-col`}>
      <div className="relative flex-1 flex flex-col overflow-hidden" style={{ background: "var(--ink)", color: "#fff" }}>
        <PartyScene />
        <SiteHeader />
        <div className="relative mx-auto w-full max-w-5xl px-4 pb-8 sm:pb-12 flex-1 flex flex-col">
          <div className="flex-1 flex flex-col justify-center py-12">
            <p className="display font-black leading-none text-[5.5rem] sm:text-[8rem]" style={{ color: "var(--sun)" }}>404</p>
            <h1 className="display mt-4 text-3xl sm:text-4xl font-black leading-tight max-w-xl">Essa página não existe, ou a festa já acabou.</h1>
            <p className="mt-4 text-lg/relaxed max-w-prose" style={{ color: "#cfd2e6" }}>O endereço pode ter sido digitado errado, ou o link expirou. Se você recebeu esse link de um buffet, peça um novo para ele.</p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link href="/" className="inline-flex items-center justify-center h-14 px-6 rounded-full font-extrabold text-base text-white transition-transform active:scale-[0.98]" style={{ background: "var(--berry)" }}>Ir para o início</Link>
              <Link href="/login" className="inline-flex items-center justify-center h-14 px-6 rounded-full font-bold text-base ring-2 ring-inset ring-white/30 hover:bg-white/10">Entrar no meu buffet</Link>
            </div>
          </div>
        </div>
      </div>
      <PublicFooter variant="light" cta={false} />
    </main>
  );
}
