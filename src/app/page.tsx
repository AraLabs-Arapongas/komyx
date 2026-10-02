import Link from "next/link";
import { Check, MessageCircle, Sparkles } from "lucide-react";
import { Bunting } from "@/components/public/bunting";
import { PolaroidGallery } from "@/components/public/polaroid-gallery";
import { PublicFooter } from "@/components/public/public-footer";
import { HeroSlides } from "@/components/marketing/hero-slides";
import { AppMocks } from "@/components/marketing/app-mocks";
import { publicFontClass } from "@/lib/fonts";
import { LAUNCH_PRICE } from "@/lib/billing";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Festeja · agenda, orçamento, contrato e convite do seu buffet", description: "O cliente monta o orçamento e reserva com Pix pela sua página. Você confirma, gera o contrato e cobra pelo WhatsApp." };

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
const GALLERY = [
  { url: "/demo/festa-1.jpg", caption: "Sua página pública, com suas fotos" },
  { url: "/demo/festa-2.jpg", caption: "Temas com foto no orçamento" },
  { url: "/demo/festa-3.jpg", caption: "Convite que o cliente personaliza" },
  { url: "/demo/festa-4.jpg", caption: "Portaria marcando quem chegou" },
];
const ALL_FEATURES = ["Agenda, orçamentos e eventos", "Clientes e aniversariantes", "Contratos e Pix com identificador", "Página pública com orçamento online", "Site com suas cores, fonte, logo e capa", "Temas de festa com fotos", "Portaria no celular", "Proprietária + equipe", "App para o cliente acompanhar a festa"];

export default function LandingPage() {
  return (
    <main className={`${publicFontClass} public-theme font-festa flex-1 flex flex-col`}>
      {/* HERO */}
      <section className="relative overflow-hidden" style={{ background: "var(--ink)", color: "var(--paper)" }}>
        <div className="absolute inset-x-0 top-0"><Bunting /></div>
        <header className="relative mx-auto max-w-5xl px-4 pt-24 sm:pt-28 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 font-extrabold tracking-wide uppercase text-sm" style={{ color: "var(--sun)" }}><span className="h-9 w-9 rounded-full grid place-items-center display text-lg" style={{ background: "var(--sun)", color: "var(--ink)" }}>F</span> Festeja</Link>
          <nav className="flex items-center gap-2">
            <Link href="/login" className="inline-flex h-10 items-center rounded-full px-4 text-sm font-bold ring-2 ring-inset ring-white/30 hover:bg-white/10">Entrar</Link>
            <Link href="/signup" className="inline-flex h-10 items-center rounded-full px-4 text-sm font-extrabold" style={{ background: "var(--berry)", color: "#fff" }}>Criar meu buffet</Link>
          </nav>
        </header>
        <div className="mx-auto max-w-5xl px-4 pt-10 pb-6">
          <h1 className="display font-extrabold text-4xl sm:text-5xl md:text-6xl leading-[1.02] max-w-3xl">A festa se vende sozinha. Você só confirma.</h1>
          <p className="mt-5 text-lg/relaxed max-w-prose" style={{ color: "#cfd2e6" }}>Agenda, orçamento, Pix, contrato, convite e portaria em um lugar só, feito para buffet infantil e de eventos. Sem planilha, sem caderno, sem perder festa no WhatsApp.</p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <Link href="/signup" className="inline-flex items-center justify-center gap-2 h-14 px-6 rounded-full font-extrabold text-base transition-transform active:scale-[0.98]" style={{ background: "var(--berry)", color: "#fff" }}><Sparkles className="h-5 w-5" /> Criar meu buffet</Link>
            <Link href="/p/festa-cia-buffet" className="inline-flex items-center justify-center gap-2 h-14 px-6 rounded-full font-bold text-base ring-2 ring-inset ring-white/30 hover:bg-white/10">Ver uma página de buffet</Link>
          </div>
          <p className="mt-3 text-sm" style={{ color: "#9da1bd" }}>{formatCurrency(LAUNCH_PRICE)}/mês, tudo incluído. Cancele quando quiser.</p>
        </div>
        <div className="mx-auto max-w-5xl px-4 pb-14 sm:pb-20 pt-6">
          <HeroSlides />
        </div>
      </section>

      {/* HIGHLIGHTS */}
      <section className="mx-auto max-w-5xl px-4 py-8">
        <ul className="flex flex-wrap gap-2">
          {HIGHLIGHTS.map((h) => <li key={h} className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-bold" style={{ background: "var(--paper-2)", color: "var(--ink)" }}><Check className="h-4 w-4" style={{ color: "var(--mint)" }} /> {h}</li>)}
        </ul>
      </section>

      {/* GALLERY */}
      <section className="mx-auto max-w-5xl px-4 py-6">
        <h2 className="display font-extrabold text-3xl sm:text-4xl mb-2">Bonito por fora, organizado por dentro</h2>
        <p className="mb-2" style={{ color: "var(--muted-ink)" }}>A página do buffet tem cara de convite. O painel da dona tem cara de trabalho feito.</p>
        <PolaroidGallery items={GALLERY} />
      </section>

      {/* HOW IT WORKS */}
      <section style={{ background: "var(--ink)", color: "var(--paper)" }}>
        <div className="mx-auto max-w-5xl px-4 pt-12 pb-16 grid gap-8 md:grid-cols-2 md:items-start">
          <div>
            <h2 className="display font-extrabold text-3xl sm:text-4xl">Para quem vende a festa</h2>
            <ol className="mt-6 space-y-4">{STEPS_OWNER.map(([t, d], i) => <li key={t} className="flex gap-3"><span className="h-8 w-8 shrink-0 rounded-full grid place-items-center display font-extrabold" style={{ background: "var(--sun)", color: "var(--ink)" }}>{i + 1}</span><div><p className="font-extrabold">{t}</p><p className="text-sm" style={{ color: "#cfd2e6" }}>{d}</p></div></li>)}</ol>
          </div>
          <div className="scallop rounded-b-3xl pt-8 px-5 pb-6 sm:px-8" style={{ color: "var(--ink)" }}>
            <h2 className="display font-extrabold text-2xl mb-4">Para quem compra a festa</h2>
            <ol className="space-y-4">{STEPS_CLIENT.map(([t, d], i) => <li key={t} className="flex gap-3"><span className="h-8 w-8 shrink-0 rounded-full grid place-items-center display font-extrabold text-white" style={{ background: "var(--berry)" }}>{i + 1}</span><div><p className="font-extrabold">{t}</p><p className="text-sm" style={{ color: "var(--muted-ink)" }}>{d}</p></div></li>)}</ol>
          </div>
        </div>
      </section>

      {/* APP */}
      <AppMocks />

      {/* PRICE */}
      <section id="precos" className="mx-auto max-w-5xl px-4 py-14">
        <div className="grid gap-8 md:grid-cols-[1fr_1fr] md:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide" style={{ background: "var(--sun)", color: "var(--ink)" }}>Oferta de lançamento</p>
            <h2 className="display font-extrabold text-3xl sm:text-4xl mt-4">Um plano, tudo incluído.</h2>
            <p className="mt-3" style={{ color: "var(--muted-ink)" }}>Quem entra agora fica com todos os recursos, inclusive os que um dia virarão Premium, por este preço. Para sempre. Sem taxa por festa, sem fidelidade: cancele e reative quando quiser.</p>
          </div>
          <div className="rounded-3xl bg-white border-2 p-6 space-y-4 shadow-[0_18px_50px_rgba(27,31,58,0.12)]" style={{ borderColor: "var(--berry)" }}>
            <div className="flex items-baseline justify-between gap-3 flex-wrap"><p className="display font-extrabold text-xl">Festeja completo</p><p className="display font-extrabold text-4xl" style={{ color: "var(--berry)" }}>{formatCurrency(LAUNCH_PRICE)}<span className="text-sm font-bold" style={{ color: "var(--muted-ink)" }}>/mês</span></p></div>
            <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">{ALL_FEATURES.map((i) => <li key={i} className="flex gap-2"><Check className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "var(--mint)" }} /> {i}</li>)}</ul>
            <Link href="/signup" className="inline-flex w-full items-center justify-center h-14 rounded-full font-extrabold text-base" style={{ background: "var(--berry)", color: "#fff" }}>Criar meu buffet por {formatCurrency(LAUNCH_PRICE)}/mês</Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden" style={{ background: "var(--ink)", color: "var(--paper)" }}>
        <div className="absolute inset-x-0 top-0"><Bunting /></div>
        <div className="mx-auto max-w-5xl px-4 pt-24 pb-16 text-center space-y-4">
          <h2 className="display font-extrabold text-3xl sm:text-5xl">Pronta para parar de perder festa no WhatsApp?</h2>
          <p style={{ color: "#cfd2e6" }}>Crie o buffet, cadastre dois pacotes e mande o link para o próximo cliente que perguntar o preço.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link href="/signup" className="inline-flex items-center justify-center gap-2 h-14 px-6 rounded-full font-extrabold" style={{ background: "var(--berry)", color: "#fff" }}>Criar meu buffet</Link>
            <a href="https://wa.me/5511999999999?text=Oi!%20Quero%20conhecer%20o%20Festeja" target="_blank" rel="noopener" className="inline-flex items-center justify-center gap-2 h-14 px-6 rounded-full font-bold ring-2 ring-inset ring-white/30 hover:bg-white/10"><MessageCircle className="h-5 w-5" /> Falar com a gente</a>
          </div>
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}
