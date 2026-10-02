import { Check, MessageCircle, QrCode, Bell, Home, Calendar, Inbox, Menu } from "lucide-react";
import { Reveal } from "./reveal";

const ink = "var(--ink)";
const muted = "var(--muted-ink)";

/** CSS phone frame; content is plain JSX styled like the real app. */
function Phone({ title, children, tint = "var(--berry)" }: { title: string; children: React.ReactNode; tint?: string }) {
  return (
    <figure data-stagger className="float-slow mx-auto w-[250px] max-md:shrink-0 max-md:snap-center">
      <div className="rounded-[2.2rem] p-2 shadow-[0_24px_60px_rgba(27,31,58,0.35)]" style={{ background: ink }}>
        <div className="rounded-[1.8rem] overflow-hidden bg-[#faf7f2] text-[#1c1917]" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
          <div className="h-6 flex items-center justify-center"><span className="h-4 w-20 rounded-full" style={{ background: ink }} /></div>
          <div className="px-3 pb-3 min-h-[380px] max-md:min-h-[340px] text-[11px] leading-snug">{children}</div>
          <div className="flex items-center justify-around py-2 border-t border-[#e7e2da] text-[9px]" style={{ color: "#78716c" }}>
            <span className="flex flex-col items-center" style={{ color: tint }}><Home className="h-4 w-4" />Início</span>
            <span className="flex flex-col items-center"><Calendar className="h-4 w-4" />Agenda</span>
            <span className="flex flex-col items-center"><Inbox className="h-4 w-4" />Pedidos</span>
            <span className="flex flex-col items-center"><Menu className="h-4 w-4" />Menu</span>
          </div>
        </div>
      </div>
      <figcaption className="mt-4 max-md:mt-2 text-center font-extrabold" style={{ color: ink }}>{title}</figcaption>
    </figure>
  );
}

function Card({ children, tone }: { children: React.ReactNode; tone?: "amber" | "green" }) {
  const bg = tone === "amber" ? "#fffbeb" : tone === "green" ? "#ecfdf5" : "#fff";
  const border = tone === "amber" ? "#fcd34d" : tone === "green" ? "#a7f3d0" : "#e7e2da";
  return <div className="rounded-xl border p-2 mb-2" style={{ background: bg, borderColor: border }}>{children}</div>;
}
const Btn = ({ children, solid }: { children: React.ReactNode; solid?: boolean }) => <span className="inline-flex items-center rounded-lg px-2 py-1 text-[10px] font-bold mr-1" style={{ background: solid ? "#c2410c" : "#fff1e8", color: solid ? "#fff" : "#c2410c" }}>{children}</span>;

/** "Tem app" section: owner day to day, door on party day, client following the booking. */
export function AppMocks() {
  return (
    <section className="snap-page mx-auto w-full max-w-5xl px-4 py-14 max-md:py-4 max-md:flex max-md:flex-col max-md:justify-center">
      <Reveal className="text-center max-w-2xl mx-auto">
        <p className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide" style={{ background: "var(--sun)", color: ink }}>Tem app</p>
        <h2 className="display font-extrabold text-3xl sm:text-4xl mt-4 max-md:mt-2 max-md:text-2xl">No celular da dona, da portaria e do cliente.</h2>
        <p className="mt-3 max-md:mt-1.5 max-md:text-xs" style={{ color: muted }}>O mesmo Komyx em três mãos: quem vende confirma de qualquer lugar, quem está na porta resolve a festa em tempo real, e o cliente acompanha tudo sem ligar para perguntar.</p>
        <p className="mt-1.5 text-xs font-bold md:hidden" style={{ color: muted }}>Deslize para o lado para ver os três →</p>
      </Reveal>
      {/* Phones: horizontal snap strip on phones, three columns on desktop. */}
      <Reveal className="mt-10 max-md:mt-0 max-md:pt-6 md:grid md:gap-10 md:grid-cols-3 md:items-start max-md:flex max-md:gap-6 max-md:overflow-x-auto max-md:snap-x max-md:snap-mandatory max-md:-mx-4 max-md:px-4 max-md:pb-3 max-md:[scrollbar-width:none]">
        <Phone title="A dona, no dia a dia">
          <div className="flex items-center justify-between py-2"><b className="text-sm">Olá, Dona</b><Bell className="h-4 w-4" /></div>
          <p className="mb-2" style={{ color: "#78716c" }}><b className="text-[#1c1917]">Hoje:</b> 1 evento · 1 ação urgente · 2 novas solicitações</p>
          <Card tone="amber"><b>Ação urgente</b><p>Festa do Theo · vence em 28h</p><p className="mt-1"><Btn solid>Confirmar</Btn><Btn>Liberar data</Btn></p></Card>
          <Card><b>Novas solicitações</b><p>Mariana Costa · “tema safári, têm espaço kids?”</p><p className="mt-1"><Btn>Responder no WhatsApp</Btn></p></Card>
          <Card><b>Hoje</b><p>Chá revelação · 18:00–21:00 · 35 pessoas</p></Card>
          <div className="grid grid-cols-3 gap-1 text-center"><div className="rounded-lg bg-white p-1"><p className="text-[9px]" style={{ color: "#78716c" }}>Atrasado</p><b className="text-red-600">R$ 2.350</b></div><div className="rounded-lg bg-white p-1"><p className="text-[9px]" style={{ color: "#78716c" }}>7 dias</p><b>R$ 2.967</b></div><div className="rounded-lg bg-white p-1"><p className="text-[9px]" style={{ color: "#78716c" }}>Total</p><b>R$ 5.317</b></div></div>
        </Phone>
        <Phone title="A portaria, no dia da festa" tint="#c2410c">
          <div className="py-2"><p className="text-[9px] uppercase tracking-wide" style={{ color: "#78716c" }}>Festa & Cia · Portaria</p><b className="text-sm">Aniversário da Júlia</b></div>
          <div className="grid grid-cols-3 gap-1 text-center mb-2"><div className="rounded-lg bg-white p-1"><p className="text-[9px]" style={{ color: "#78716c" }}>Presentes</p><b>42</b></div><div className="rounded-lg bg-white p-1"><p className="text-[9px]" style={{ color: "#78716c" }}>Faltam</p><b>23</b></div><div className="rounded-lg bg-white p-1"><p className="text-[9px]" style={{ color: "#78716c" }}>Confirmados</p><b>65</b></div></div>
          {[["Família Oliveira", "2A 2C", true], ["Tia Lúcia", "2A", true], ["Pedro e Bia", "2A 1C", false], ["Avós da Júlia", "2A", false]].map(([n, p, ok]) => <div key={String(n)} className="flex items-center justify-between rounded-lg bg-white border border-[#e7e2da] px-2 py-1.5 mb-1"><span><b>{String(n)}</b> <span style={{ color: "#78716c" }}>· {String(p)}</span></span>{ok ? <Check className="h-4 w-4 text-emerald-600" /> : <Btn>Chegou</Btn>}</div>)}
          <Card tone="amber"><div className="flex items-center justify-between"><b>Fechar conta</b><b className="text-amber-700">Falta R$ 180</b></div><p style={{ color: "#78716c" }}>Bolo cenográfico · extra no dia</p><p className="mt-1"><Btn solid>Recebido · Pix</Btn><Btn>Dinheiro</Btn></p></Card>
        </Phone>
        <Phone title="O cliente, acompanhando" tint="#c2410c">
          <div className="py-2"><b className="text-sm">Minhas festas</b><p style={{ color: "#78716c" }}>Celular (11) 99999-0002</p></div>
          <Card><div className="flex items-center justify-between"><b>Festa do Theo</b><span className="rounded-full px-1.5 text-[9px] font-bold" style={{ background: "#fef3c7", color: "#92400e" }}>Reservada</span></div><p style={{ color: "#78716c" }}>ter., 13 de out. · 11:00–15:00</p><p className="text-amber-700 font-bold">Pague o sinal para confirmar</p></Card>
          <Card tone="green"><div className="flex items-center gap-2"><QrCode className="h-9 w-9" /><div><b>Pix do sinal · R$ 750</b><p style={{ color: "#78716c" }}>Identificador FESTABBBB</p></div></div><p className="mt-1"><Btn solid>Copiar Pix copia e cola</Btn></p></Card>
          <Card><b>Orçamento</b><p>Pacote Bronze · R$ 2.500</p><p><Check className="inline h-3 w-3 text-emerald-600" /> 1. Sinal · R$ 750 · <span className="text-emerald-700">paga</span></p><p>2. Saldo · 06/10 · R$ 1.750</p></Card>
          <Card><div className="flex items-center justify-between"><b>Contrato nº 12</b><Btn>Ler e aceitar</Btn></div></Card>
          <p className="text-center"><Btn><MessageCircle className="h-3 w-3 mr-1" /> Falar com o buffet</Btn></p>
        </Phone>
      </Reveal>
    </section>
  );
}
