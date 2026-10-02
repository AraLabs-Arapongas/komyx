import Link from "next/link";
import { Check, MessageCircle, Sparkles } from "lucide-react";
import { PartyScene } from "@/components/marketing/party-scene";
import { PublicFooter } from "@/components/public/public-footer";
import { HeroSlides } from "@/components/marketing/hero-slides";
import { HeroStickers } from "@/components/marketing/hero-stickers";
import { KomyxMark } from "@/components/brand/komyx-logo";
import { AppMocks } from "@/components/marketing/app-mocks";
import { PolaroidMocks } from "@/components/marketing/polaroid-mocks";
import { ScrollCue } from "@/components/marketing/scroll-cue";
import { Reveal } from "@/components/marketing/reveal";
import { publicFontClass } from "@/lib/fonts";
import { LAUNCH_PRICE, LIST_PRICE, MONTHLY_PRICE } from "@/lib/billing";
import { PriceCard } from "@/components/marketing/price-card";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Komyx · Gestão para buffets: agenda, orçamento, contrato e convite", description: "O cliente monta o orçamento e reserva com Pix pela sua página. Você confirma, gera o contrato e cobra pelo WhatsApp." };

const STEPS_OWNER = [
  ["Cadastre pacotes e temas", "Preço-base, adultos e crianças incluídos, adicionais e fotos das decorações."],
  ["Compartilhe sua página", "Link para a bio do Instagram. O cliente monta o orçamento e vê a data livre."],
  ["Confirme e cobre", "Sinal por Pix com identificador, contrato gerado sozinho, parcelas e extras com um toque."],
];
const STEPS_CLIENT = [
  ["Monta o orçamento", "Escolhe pacote, tema, data no calendário e quantas pessoas. Vê o valor na hora."],
  ["Reserva com Pix", "QR e copia-e-cola com o sinal. A data fica segura pelo prazo que o buffet define."],
  ["Acompanha pelo celular", "Página da reserva, contrato para aceitar, convite personalizado e lista de convidados."],
];
const HIGHLIGHTS = ["Um evento por dia", "Orçamento online", "Pix com identificador", "Contrato automático", "Convite com RSVP", "Portaria no celular", "Cobrança pelo WhatsApp", "Aniversariantes do ano", "App para a dona, a portaria e o cliente"];
const ALL_FEATURES = ["Agenda, orçamentos e eventos", "Clientes e aniversariantes", "Contratos e Pix com identificador", "Página pública com orçamento online", "Site com suas cores, fonte, logo e capa", "Temas de festa com fotos", "Portaria no celular", "Proprietária + equipe", "App para o cliente acompanhar a festa"];

/**
 * Landing page. On phones (< md) every block is a full-viewport "page" with mandatory vertical
 * scroll-snap (`.landing-snap .snap-page`, see globals.css); on desktop it is a regular long page.
 */
export default function LandingPage() {
  return (
    <main className={`${publicFontClass} public-theme font-festa landing-snap flex-1 flex flex-col`}>
      {/* HERO */}
      {/* No overflow-hidden here: it would turn the section into a scroll container and steal the snap pages from the document. */}
      <section className="relative" style={{ background: "var(--ink)", color: "var(--paper)" }}>
        <PartyScene />
        <div className="snap-page relative flex flex-col">
          <header className="mx-auto w-full max-w-5xl px-4 pt-6 flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-2.5" style={{ color: "var(--sun)" }}>
              <KomyxMark className="h-9 w-9" />
              <span className="leading-none"><span className="block display font-extrabold tracking-tight text-lg">Komyx</span><span className="block text-[11px] font-semibold mt-0.5" style={{ color: "#cfd2e6" }}>Gestão para buffets</span></span>
            </Link>
            {/* Only "Entrar" here: the big hero CTA right below is the one "Criar meu buffet". */}
            <nav className="flex items-center gap-2">
              <Link href="/login" className="inline-flex h-10 items-center rounded-full px-4 text-sm font-bold ring-2 ring-inset ring-white/30 hover:bg-white/10">Entrar</Link>
            </nav>
          </header>
          <div className="relative mx-auto w-full max-w-5xl px-4 pt-8 pb-2 max-md:flex-1 max-md:flex max-md:flex-col max-md:justify-center max-md:pb-20">
            <HeroStickers />
            <h1 className="display font-extrabold text-4xl sm:text-5xl md:text-[3.25rem] leading-[1.02] max-w-3xl lg:max-w-2xl">A festa se vende sozinha. Você só confirma.</h1>
            <p className="mt-5 text-lg/relaxed max-w-prose" style={{ color: "#cfd2e6" }}>Agenda, orçamento, Pix, contrato, convite e portaria em um lugar só, feito para buffet infantil e de eventos. Sem planilha, sem caderno, sem perder festa no WhatsApp.</p>
            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Link href="/signup" className="inline-flex items-center justify-center gap-2 h-14 px-6 rounded-full font-extrabold text-base transition-transform active:scale-[0.98]" style={{ background: "var(--berry)", color: "#fff" }}><Sparkles className="h-5 w-5" /> Testar 1 mês grátis</Link>
              <Link href="/p/festa-cia-buffet" className="inline-flex items-center justify-center gap-2 h-14 px-6 rounded-full font-bold text-base ring-2 ring-inset ring-white/30 hover:bg-white/10">Ver uma página de buffet</Link>
            </div>
            <p className="mt-3 text-sm" style={{ color: "#9da1bd" }}><span className="font-extrabold" style={{ color: "var(--sun)" }}>1 mês grátis.</span> Depois, de <s>{formatCurrency(LIST_PRICE)}</s> por {formatCurrency(MONTHLY_PRICE)}/mês, ou {formatCurrency(LAUNCH_PRICE)}/mês no anual.</p>
          </div>
        </div>
        <div className="snap-page relative mx-auto w-full max-w-5xl px-4 pb-14 sm:pb-20 pt-2 max-md:py-5 max-md:flex max-md:flex-col max-md:justify-center">
          <HeroSlides />
        </div>
        <ScrollCue href="#destaques" />
      </section>

      {/* HIGHLIGHTS + GALLERY (one phone page) */}
      <div className="snap-page max-md:flex max-md:flex-col max-md:justify-center">
        <section id="destaques" className="mx-auto w-full max-w-5xl px-4 py-8 max-md:py-3 max-md:px-0 scroll-mt-4">
          {/* Desktop: wrapped chips. Phones: two ticker rows (left, then right) so nothing wraps ragged. */}
          <Reveal as="ul" className="flex flex-wrap gap-2 max-md:hidden">
            {HIGHLIGHTS.map((h) => <li key={h} data-stagger className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-bold" style={{ background: "var(--paper-2)", color: "var(--ink)" }}><Check className="h-4 w-4" style={{ color: "var(--mint)" }} /> {h}</li>)}
          </Reveal>
          <Reveal className="md:hidden space-y-2 overflow-hidden" aria-label="Principais recursos">
            {[HIGHLIGHTS.slice(0, 5), HIGHLIGHTS.slice(5)].map((row, r) => (
              <ul key={r} className={`flex gap-2 w-max ${r === 1 ? "marquee marquee-rev" : "marquee"}`} style={{ "--marquee-duration": `${22 + r * 6}s` } as React.CSSProperties}>
                {[...row, ...row].map((h, i) => <li key={h + i} aria-hidden={i >= row.length ? true : undefined} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold whitespace-nowrap" style={{ background: "var(--paper-2)", color: "var(--ink)" }}><Check className="h-3.5 w-3.5" style={{ color: "var(--mint)" }} /> {h}</li>)}
              </ul>
            ))}
          </Reveal>
        </section>
        <Reveal as="section" className="mx-auto w-full max-w-5xl px-4 py-6 max-md:py-3">
          <h2 className="display font-extrabold text-3xl sm:text-4xl mb-2 max-md:text-2xl max-md:mb-1">Bonito por fora, organizado por dentro</h2>
          <p className="mb-2 max-md:text-sm" style={{ color: "var(--muted-ink)" }}>A página do buffet tem cara de convite. O painel da dona tem cara de trabalho feito.</p>
          <PolaroidMocks />
        </Reveal>
      </div>

      {/* HOW IT WORKS (two phone pages) */}
      <section style={{ background: "var(--ink)", color: "var(--paper)" }}>
        <Reveal className="mx-auto max-w-5xl px-4 pt-12 pb-16 grid gap-8 md:grid-cols-2 md:items-start max-md:p-0 max-md:gap-0">
          <div data-stagger className="snap-page max-md:px-4 max-md:flex max-md:flex-col max-md:justify-center">
            <h2 className="display font-extrabold text-3xl sm:text-4xl">Para quem vende a festa</h2>
            <ol className="mt-6 space-y-4">{STEPS_OWNER.map(([t, d], i) => <li key={t} className="flex gap-3"><span className="h-8 w-8 shrink-0 rounded-full grid place-items-center display font-extrabold" style={{ background: "var(--sun)", color: "var(--ink)" }}>{i + 1}</span><div><p className="font-extrabold">{t}</p><p className="text-sm" style={{ color: "#cfd2e6" }}>{d}</p></div></li>)}</ol>
          </div>
          <div data-stagger className="snap-page scallop rounded-b-3xl pt-8 px-5 pb-6 sm:px-8 max-md:rounded-none max-md:flex max-md:flex-col max-md:justify-center" style={{ color: "var(--ink)" }}>
            <h2 className="display font-extrabold text-2xl mb-4 max-md:text-3xl">Para quem compra a festa</h2>
            <ol className="space-y-4">{STEPS_CLIENT.map(([t, d], i) => <li key={t} className="flex gap-3"><span className="h-8 w-8 shrink-0 rounded-full grid place-items-center display font-extrabold text-white" style={{ background: "var(--berry)" }}>{i + 1}</span><div><p className="font-extrabold">{t}</p><p className="text-sm" style={{ color: "var(--muted-ink)" }}>{d}</p></div></li>)}</ol>
          </div>
        </Reveal>
      </section>

      {/* APP */}
      <AppMocks />

      {/* PRICE */}
      <section id="precos" className="snap-page mx-auto w-full max-w-5xl px-4 py-14 max-md:py-6 max-md:flex max-md:flex-col max-md:justify-center">
        <Reveal className="grid gap-8 md:grid-cols-[1fr_1fr] md:items-center max-md:gap-5">
          <div data-stagger>
            <p className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide" style={{ background: "var(--sun)", color: "var(--ink)" }}>Oferta de lançamento</p>
            <h2 className="display font-extrabold text-3xl sm:text-4xl mt-4 max-md:mt-3 max-md:text-2xl">1 mês grátis. Depois, um plano com tudo e o período que você escolher.</h2>
            <p className="mt-3 max-md:mt-2 max-md:text-sm max-md:line-clamp-2" style={{ color: "var(--muted-ink)" }}>Comece sem cartão e use tudo por 30 dias. Depois, todos os recursos em qualquer período, inclusive os que um dia virarão Premium: de R$ 199 por R$ 149 no mensal, até R$ 99/mês no anual. Sem taxa por festa; ao fim do período, renova ou para.</p>
          </div>
          <div data-stagger><PriceCard features={ALL_FEATURES} /></div>
        </Reveal>
      </section>

      {/* CTA + FOOTER (one phone page) */}
      <div className="snap-page max-md:flex max-md:flex-col">
        <section className="relative overflow-hidden max-md:flex-1 max-md:flex max-md:flex-col max-md:justify-center" style={{ background: "var(--ink)", color: "var(--paper)" }}>
          <PartyScene />
          <Reveal className="relative mx-auto max-w-5xl px-4 pt-16 pb-16 max-md:pt-8 max-md:pb-6 text-center space-y-4 max-md:space-y-3">
            <h2 className="display font-extrabold text-3xl sm:text-5xl max-md:text-2xl">Pronta para parar de perder festa no WhatsApp?</h2>
            <p className="max-md:text-sm" style={{ color: "#cfd2e6" }}>Crie o buffet, cadastre dois pacotes e mande o link para o próximo cliente que perguntar o preço.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link href="/signup" className="inline-flex items-center justify-center gap-2 h-14 px-6 rounded-full font-extrabold" style={{ background: "var(--berry)", color: "#fff" }}>Criar meu buffet</Link>
              <a href="https://wa.me/5511999999999?text=Oi!%20Quero%20conhecer%20o%20Komyx" target="_blank" rel="noopener" className="inline-flex items-center justify-center gap-2 h-14 px-6 rounded-full font-bold ring-2 ring-inset ring-white/30 hover:bg-white/10"><MessageCircle className="h-5 w-5" /> Falar com a gente</a>
            </div>
          </Reveal>
        </section>
        <PublicFooter cta={false} />
      </div>
    </main>
  );
}
