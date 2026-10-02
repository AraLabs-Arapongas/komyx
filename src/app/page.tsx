import Link from "next/link";
import { CalendarDays, FileSignature, MessageCircle, QrCode, Smartphone, Sparkles, Check } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { PublicFooter } from "@/components/public/public-footer";
import { LAUNCH_PRICE } from "@/lib/billing";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Festeja · agenda, orçamento, contrato e convite do seu buffet", description: "Venda, organize e realize festas em um só lugar. Página pública que vende sozinha, orçamento em 2 minutos, reserva com Pix, contrato automático e portaria no celular." };

const STEPS_OWNER = [
  ["Cadastre pacotes e temas", "Preço-base, adultos e crianças incluídos, adicionais e fotos das decorações."],
  ["Compartilhe sua página", "Link para a bio do Instagram. O cliente monta o orçamento e vê a data livre."],
  ["Confirme e cobre", "Sinal por Pix com identificador, contrato gerado sozinho, parcelas e extras com um toque."],
];
const STEPS_CLIENT = [
  ["Monta o orçamento em 2 minutos", "Escolhe pacote, tema, data no calendário e quantas pessoas."],
  ["Reserva a data com Pix", "QR e copia-e-cola com o valor do sinal. A data fica segura pelo prazo que você define."],
  ["Acompanha pelo celular", "Página da reserva, contrato para aceitar, lista de convidados e convite personalizado."],
];
const FEATURES = [
  [CalendarDays, "Agenda e orçamentos", "Um evento por dia, reservas com prazo, orçamento que vira evento sem redigitar."],
  [QrCode, "Pix e cobrança", "Sinal e saldo com QR e identificador. Parcelas, extras do dia e botão Cobrar no WhatsApp."],
  [FileSignature, "Contrato automático", "Modelo do buffet preenchido com cliente, itens e parcelas. Cliente aceita pelo link."],
  [Smartphone, "Portaria no celular", "Quem está na porta marca chegadas, adiciona convidado e fecha a conta dos extras."],
  [MessageCircle, "Tudo pelo WhatsApp", "Solicitações, cobranças e lembretes de aniversário com mensagem pronta. Você decide quando enviar."],
  [Sparkles, "Página que vende", "Fotos, destaques, depoimentos e orçamento online. No Premium, com as cores do seu buffet."],
] as const;

const ALL_FEATURES = ["Agenda, orçamentos e eventos", "Clientes e aniversariantes", "Contratos e Pix com identificador", "Página pública com orçamento online", "Site com suas cores, fonte, logo e capa", "Temas de festa com fotos", "Portaria no celular", "Proprietária + equipe", "App para o cliente acompanhar a festa"];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold"><span className="h-8 w-8 rounded-lg bg-brand text-brand-fg grid place-items-center font-bold">F</span> Festeja</Link>
        <nav className="flex items-center gap-2">
          <a href="#precos" className="hidden sm:inline-flex text-sm text-muted hover:text-foreground px-3">Preços</a>
          <Link href="/login" className={buttonClass("outline", "sm")}>Entrar</Link>
          <Link href="/signup" className={buttonClass("primary", "sm")}>Criar meu buffet</Link>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-4 pt-10 pb-16 grid gap-10 md:grid-cols-2 md:items-center">
        <div className="space-y-6">
          <p className="inline-flex items-center gap-2 rounded-full bg-brand-soft text-brand px-3 py-1 text-xs font-semibold">Para buffets infantis e de eventos</p>
          <h1 className="text-4xl sm:text-5xl font-bold leading-[1.05] tracking-tight">Venda, organize e realize festas em um só lugar.</h1>
          <p className="text-lg text-muted">O cliente monta o orçamento e reserva com Pix pela sua página. Você confirma, gera o contrato e cobra pelo WhatsApp. Sem planilha, sem caderno, sem esquecer ninguém.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/signup" className={buttonClass("primary", "lg")}>Criar meu buffet grátis</Link>
            <Link href="/p/festa-cia-buffet" className={buttonClass("outline", "lg")}>Ver uma página de exemplo</Link>
          </div>
          <p className="text-xs text-muted">Teste com o buffet de demonstração. Sem cartão para começar.</p>
        </div>
        <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm space-y-3">
          <p className="text-xs uppercase tracking-wide text-muted">Como fica para a dona</p>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm"><b>Ação urgente</b> · Festa do Theo · vence em 28h <span className="ml-2 inline-flex rounded-full bg-brand text-white text-xs px-2 py-0.5">Confirmar</span></div>
          <div className="rounded-2xl border border-border p-3 text-sm"><b>Novas solicitações</b> · Mariana Costa · “Aniversário de 1 ano, tema safári” <span className="text-brand ml-2">Responder</span></div>
          <div className="rounded-2xl border border-border p-3 text-sm"><b>Hoje</b> · Chá revelação · 18:00–21:00 · 35 pessoas · <span className="text-emerald-700 font-medium">pago</span></div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm"><div className="rounded-xl bg-stone-50 p-2"><p className="text-xs text-muted">Atrasado</p><p className="font-semibold text-red-600">R$ 2.350</p></div><div className="rounded-xl bg-stone-50 p-2"><p className="text-xs text-muted">7 dias</p><p className="font-semibold">R$ 2.967</p></div><div className="rounded-xl bg-stone-50 p-2"><p className="text-xs text-muted">Total</p><p className="font-semibold">R$ 5.317</p></div></div>
        </div>
      </section>

      <section className="bg-surface border-y border-border">
        <div className="mx-auto max-w-6xl px-4 py-14 grid gap-10 md:grid-cols-2">
          <div><h2 className="text-2xl font-bold mb-4">Para quem vende</h2><ol className="space-y-4">{STEPS_OWNER.map(([t, d], i) => <li key={t} className="flex gap-3"><span className="h-7 w-7 shrink-0 rounded-full bg-brand text-brand-fg grid place-items-center text-sm font-bold">{i + 1}</span><div><p className="font-semibold">{t}</p><p className="text-sm text-muted">{d}</p></div></li>)}</ol></div>
          <div><h2 className="text-2xl font-bold mb-4">Para quem compra a festa</h2><ol className="space-y-4">{STEPS_CLIENT.map(([t, d], i) => <li key={t} className="flex gap-3"><span className="h-7 w-7 shrink-0 rounded-full bg-stone-800 text-white grid place-items-center text-sm font-bold">{i + 1}</span><div><p className="font-semibold">{t}</p><p className="text-sm text-muted">{d}</p></div></li>)}</ol></div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-bold mb-6">O que vem dentro</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([Icon, t, d]) => (
            <div key={t} className="rounded-2xl border border-border bg-surface p-5"><span className="h-10 w-10 rounded-xl bg-brand-soft text-brand grid place-items-center mb-3"><Icon className="h-5 w-5" /></span><p className="font-semibold">{t}</p><p className="text-sm text-muted mt-1">{d}</p></div>
          ))}
        </div>
      </section>

      <section id="precos" className="bg-surface border-y border-border">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-2xl font-bold mb-2">Um plano, tudo incluído</h2>
          <p className="text-muted mb-8">Mensalidade fixa, sem taxa por festa e sem fidelidade. Cancele e reative quando quiser.</p>
          <div className="max-w-xl rounded-3xl border border-brand bg-surface p-6 shadow-sm space-y-4">
            <p className="inline-flex items-center gap-2 rounded-full bg-brand-soft text-brand px-3 py-1 text-xs font-semibold">Oferta de lançamento</p>
            <div className="flex items-baseline justify-between gap-3 flex-wrap"><p className="text-lg font-semibold">Festeja completo</p><p className="text-3xl font-bold">{formatCurrency(LAUNCH_PRICE)}<span className="text-sm font-normal text-muted">/mês</span></p></div>
            <p className="text-sm text-muted">Quem entra agora fica com todos os recursos, inclusive os que virarão Premium, por este preço. Para sempre.</p>
            <ul className="grid sm:grid-cols-2 gap-2 text-sm">{ALL_FEATURES.map((i) => <li key={i} className="flex gap-2"><Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /> {i}</li>)}</ul>
            <Link href="/signup" className={buttonClass("primary", "lg", "w-full")}>Criar meu buffet por {formatCurrency(LAUNCH_PRICE)}/mês</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 text-center space-y-4">
        <h2 className="text-3xl font-bold">Pronta para parar de perder festa no WhatsApp?</h2>
        <p className="text-muted">Crie o buffet, cadastre dois pacotes e mande o link para o próximo cliente que perguntar o preço.</p>
        <Link href="/signup" className={buttonClass("primary", "lg")}>Criar meu buffet</Link>
      </section>
      <PublicFooter variant="light" />
    </main>
  );
}
