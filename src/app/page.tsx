import Link from "next/link";
import { Check, MessageCircle, Sparkles, FileSignature, History, Link2, ShieldCheck, Bell, QrCode } from "lucide-react";
import { PublicFooter } from "@/components/public/public-footer";
import { HeroSlides } from "@/components/marketing/hero-slides";
import { AppMocks } from "@/components/marketing/app-mocks";
import { publicFontClass } from "@/lib/fonts";
import { LAUNCH_PRICE } from "@/lib/billing";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Festeja · agenda, orçamento, contrato e convite do seu buffet", description: "O cliente monta o orçamento e reserva com Pix pela sua página. Você confirma, o contrato se escreve sozinho e a cobrança vai pelo WhatsApp." };

const STEPS_OWNER = [
  ["Cadastre pacotes e temas", "Preço-base, adultos e crianças incluídos, adicionais e fotos das decorações. Uma vez só."],
  ["Compartilhe sua página", "Link para a bio do Instagram. O cliente monta o orçamento e vê a data livre, de madrugada se quiser."],
  ["Confirme e cobre", "Sinal por Pix com identificador, contrato gerado sozinho, parcelas e extras com um toque, cobrança pronta no WhatsApp."],
];
const STEPS_CLIENT = [
  ["Monta o orçamento", "Escolhe pacote, tema, data no calendário e quantas pessoas. Vê o valor na hora."],
  ["Reserva com Pix", "QR e copia-e-cola com o sinal. A data fica segura pelo prazo que o buffet define."],
  ["Acompanha pelo celular", "Página da reserva, contrato para aceitar, convite personalizado e lista de convidados."],
];
const REGISTRO = [
  [FileSignature, "Contrato gerado e guardado", "Seu modelo preenchido no aceite do orçamento, numerado, versionado e aceito pelo cliente no link. Nada redigido um a um."],
  [History, "Histórico de tudo", "Cada mudança de status, cada pagamento, cada extra do dia tem data e hora. Quem fez o quê, sem discussão."],
  [QrCode, "Pix que se identifica", "Sinal e saldo com identificador no extrato. Você confere e confirma; o cliente recebe o comprovante no link."],
  [Link2, "Links que não expiram", "Reserva, convite, RSVP e portaria têm link curto permanente. Reenvie quantas vezes precisar."],
  [Bell, "Avisos no lugar certo", "Pedido novo, reserva online e contrato aceito viram notificação. Confirmação de presença fica na ficha, sem te incomodar."],
  [ShieldCheck, "Cada um vê o que deve", "Equipe trabalha nos eventos sem ver cobrança do Festeja ou configurações. Cliente vê só a própria festa."],
] as const;
const ALL_FEATURES = ["Agenda com um evento por dia", "Orçamento online e interno no mesmo fluxo", "Reserva com prazo e Pix", "Contrato automático com aceite online", "Parcelas, extras e cobrança pelo WhatsApp", "Página pública com suas cores e fotos", "Temas de festa com foto", "Convite personalizado e RSVP", "Portaria no celular", "Aniversariantes do ano para revender", "App para dona, portaria e cliente", "Proprietária + equipe"];

export default function LandingPage() {
  return (
    <main className={`${publicFontClass} public-theme festeja-landing font-festa flex-1 flex flex-col`}>
      {/* HERO */}
      <section className="relative overflow-hidden confetti" style={{ background: "var(--ink)", color: "var(--paper)" }}>
        <header className="relative mx-auto max-w-5xl px-4 pt-6 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 font-extrabold tracking-wide uppercase text-sm" style={{ color: "var(--sun)" }}><span className="h-9 w-9 rounded-xl grid place-items-center display text-lg" style={{ background: "var(--berry)", color: "#fff" }}>F</span> Festeja</Link>
          <nav className="flex items-center gap-2">
            <a href="#precos" className="hidden sm:inline-flex h-10 items-center px-3 text-sm font-bold" style={{ color: "#cfd2e6" }}>Preço</a>
            <Link href="/login" className="inline-flex h-10 items-center rounded-full px-4 text-sm font-bold ring-2 ring-inset ring-white/30 hover:bg-white/10">Entrar</Link>
            <Link href="/signup" className="inline-flex h-10 items-center rounded-full px-4 text-sm font-extrabold" style={{ background: "var(--berry)", color: "#fff" }}>Criar meu buffet</Link>
          </nav>
        </header>
        <div className="relative mx-auto max-w-5xl px-4 pt-14 sm:pt-20 pb-6">
          <p className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide" style={{ background: "rgba(255,255,255,0.1)", color: "var(--sun)" }}>Para buffets infantis e de eventos</p>
          <h1 className="display font-extrabold text-4xl sm:text-5xl md:text-6xl leading-[1.02] max-w-3xl mt-4">A festa se vende sozinha.<br />Você só confirma.</h1>
          <p className="mt-5 text-lg/relaxed max-w-prose" style={{ color: "#cfd2e6" }}>Agenda, orçamento, Pix, contrato, convite e portaria em um lugar só. Tudo registrado e automático: o que hoje você redige, confere e cobra um a um, o Festeja faz quando o cliente aceita.</p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <Link href="/signup" className="inline-flex items-center justify-center gap-2 h-14 px-6 rounded-full font-extrabold text-base transition-transform active:scale-[0.98]" style={{ background: "var(--berry)", color: "#fff" }}><Sparkles className="h-5 w-5" /> Criar meu buffet</Link>
            <Link href="/p/festa-cia-buffet" className="inline-flex items-center justify-center gap-2 h-14 px-6 rounded-full font-bold text-base ring-2 ring-inset ring-white/30 hover:bg-white/10">Ver a página de um buffet</Link>
          </div>
          <p className="mt-3 text-sm" style={{ color: "#9da1bd" }}>{formatCurrency(LAUNCH_PRICE)}/mês, tudo incluído. Cancele quando quiser.</p>
        </div>
        <div className="relative mx-auto max-w-5xl px-4 pb-14 sm:pb-20 pt-8">
          <HeroSlides />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-5xl px-4 py-14 grid gap-8 md:grid-cols-2">
        <div className="rounded-3xl p-6 sm:p-8" style={{ background: "var(--paper-2)" }}>
          <h2 className="display font-extrabold text-2xl sm:text-3xl">Para quem vende a festa</h2>
          <ol className="mt-6 space-y-4">{STEPS_OWNER.map(([t, d], i) => <li key={t} className="flex gap-3"><span className="h-8 w-8 shrink-0 rounded-full grid place-items-center display font-extrabold text-white" style={{ background: "var(--berry)" }}>{i + 1}</span><div><p className="font-extrabold">{t}</p><p className="text-sm" style={{ color: "var(--muted-ink)" }}>{d}</p></div></li>)}</ol>
        </div>
        <div className="rounded-3xl p-6 sm:p-8 bg-white border" style={{ borderColor: "#ece7dc" }}>
          <h2 className="display font-extrabold text-2xl sm:text-3xl">Para quem compra a festa</h2>
          <ol className="mt-6 space-y-4">{STEPS_CLIENT.map(([t, d], i) => <li key={t} className="flex gap-3"><span className="h-8 w-8 shrink-0 rounded-full grid place-items-center display font-extrabold" style={{ background: "var(--sun)", color: "var(--ink)" }}>{i + 1}</span><div><p className="font-extrabold">{t}</p><p className="text-sm" style={{ color: "var(--muted-ink)" }}>{d}</p></div></li>)}</ol>
        </div>
      </section>

      {/* REGISTRADO E AUTOMÁTICO */}
      <section style={{ background: "var(--ink)", color: "var(--paper)" }}>
        <div className="mx-auto max-w-5xl px-4 py-14">
          <h2 className="display font-extrabold text-3xl sm:text-4xl">Tudo registrado. Quase tudo automático.</h2>
          <p className="mt-3 max-w-prose" style={{ color: "#cfd2e6" }}>O trabalho que hoje é copiar, colar e conferir vira regra do sistema. Você decide; o Festeja executa e guarda.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {REGISTRO.map(([Icon, t, d]) => (
              <div key={t} className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.06)" }}><span className="h-10 w-10 rounded-xl grid place-items-center mb-3" style={{ background: "var(--sun)", color: "var(--ink)" }}><Icon className="h-5 w-5" /></span><p className="font-extrabold">{t}</p><p className="text-sm mt-1" style={{ color: "#cfd2e6" }}>{d}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* APP */}
      <AppMocks />

      {/* PRICE */}
      <section id="precos" style={{ background: "var(--paper-2)" }}>
        <div className="mx-auto max-w-5xl px-4 py-14 grid gap-8 md:grid-cols-[1fr_1fr] md:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide" style={{ background: "var(--sun)", color: "var(--ink)" }}>Oferta de lançamento</p>
            <h2 className="display font-extrabold text-3xl sm:text-4xl mt-4">Um plano, tudo incluído.</h2>
            <p className="mt-3" style={{ color: "var(--muted-ink)" }}>Quem entra agora fica com todos os recursos, inclusive os que um dia virarão Premium, por este preço. Para sempre. Sem taxa por festa, sem fidelidade: cancele e reative quando quiser.</p>
          </div>
          <div className="rounded-3xl bg-white border-2 p-6 space-y-4 shadow-[0_18px_50px_rgba(20,26,58,0.12)]" style={{ borderColor: "var(--berry)" }}>
            <div className="flex items-baseline justify-between gap-3 flex-wrap"><p className="display font-extrabold text-xl">Festeja completo</p><p className="display font-extrabold text-4xl" style={{ color: "var(--berry)" }}>{formatCurrency(LAUNCH_PRICE)}<span className="text-sm font-bold" style={{ color: "var(--muted-ink)" }}>/mês</span></p></div>
            <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">{ALL_FEATURES.map((i) => <li key={i} className="flex gap-2"><Check className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "var(--mint)" }} /> {i}</li>)}</ul>
            <Link href="/signup" className="inline-flex w-full items-center justify-center h-14 rounded-full font-extrabold text-base" style={{ background: "var(--berry)", color: "#fff" }}>Criar meu buffet por {formatCurrency(LAUNCH_PRICE)}/mês</Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden confetti" style={{ background: "var(--ink)", color: "var(--paper)" }}>
        <div className="relative mx-auto max-w-5xl px-4 py-16 text-center space-y-4">
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
