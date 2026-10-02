"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Check, MessageCircle, QrCode, Calendar, FileSignature, DoorOpen, Calculator } from "lucide-react";

type Slide = { icon: ReactNode; eyebrow: string; title: string; text: string; mock: ReactNode };

const ink = "var(--ink)";
const muted = "var(--muted-ink)";

function Pill({ children, color = "var(--mint)" }: { children: ReactNode; color?: string }) {
  return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-extrabold" style={{ background: color, color: ink }}>{children}</span>;
}

function slides(): Slide[] { return [
  {
    icon: <Calculator className="h-4 w-4" />, eyebrow: "Orçamento online",
    title: "O cliente monta o orçamento em 2 minutos.",
    text: "Pacote, tema, data no calendário com os dias ocupados, quantas pessoas. Ele vê o valor na hora e você recebe tudo pronto.",
    mock: (
      <div className="space-y-2">
        <div className="flex gap-1 text-[10px] font-extrabold">{["Pacote", "Data", "Pessoas", "Seus dados", "Revisão"].map((s, i) => <span key={s} className="rounded-full px-2 py-1" style={{ background: i === 0 ? ink : "var(--paper-2)", color: i === 0 ? "#fff" : ink }}>{i + 1} {s}</span>)}</div>
        {[["Pacote Bronze", "R$ 2.500"], ["Pacote Prata", "R$ 3.900"]].map(([n, v], i) => <div key={n} className="flex justify-between rounded-xl border-2 px-3 py-2 text-sm font-bold" style={{ borderColor: i === 1 ? "var(--berry)" : "#ece7dc" }}><span>{n}</span><span style={{ color: "var(--berry)" }}>{v}</span></div>)}
        <div className="flex items-center justify-between rounded-2xl px-3 py-2 text-white" style={{ background: ink }}><span className="display font-extrabold text-lg">R$ 3.900</span><span className="rounded-full px-3 py-1 text-xs font-extrabold" style={{ background: "var(--berry)" }}>Continuar</span></div>
      </div>
    ),
  },
  {
    icon: <QrCode className="h-4 w-4" />, eyebrow: "Reserva com Pix",
    title: "A data fica segura com o sinal por Pix.",
    text: "QR e copia-e-cola com o valor do sinal e um identificador. Prazo que você define; passou, a data volta a ficar livre sozinha.",
    mock: (
      <div className="grid grid-cols-[110px_1fr] gap-3 items-center rounded-2xl p-3" style={{ background: "#e9f8f3", border: "1px solid #bfeadb" }}>
        <span className="h-[100px] w-[100px] rounded-xl bg-white grid place-items-center" aria-hidden="true"><QrCode className="h-16 w-16" style={{ color: ink }} /></span>
        <div className="text-sm space-y-1">
          <p className="font-extrabold">Sinal · R$ 1.170,00</p>
          <p style={{ color: muted }}>Data segura até <b style={{ color: ink }}>sáb 17:32</b></p>
          <p className="text-xs rounded-lg px-2 py-1 bg-white inline-block">Identificador <b>FESTA9F2A1C</b></p>
          <p className="text-xs" style={{ color: muted }}>Chave <b style={{ color: ink }}>12.345.678/0001-90</b></p>
          <p className="flex flex-wrap gap-1.5 pt-1"><span className="rounded-full px-2.5 py-1 text-[11px] font-extrabold text-white" style={{ background: "var(--berry)" }}>Copiar Pix copia e cola</span><Pill>Confirma ao cair</Pill></p>
        </div>
      </div>
    ),
  },
  {
    icon: <Calendar className="h-4 w-4" />, eyebrow: "Agenda",
    title: "Uma festa por dia. Nunca duas.",
    text: "A agenda bloqueia o dia reservado, mostra o que vence e deixa a dona decidir quando abrir exceção.",
    mock: (
      <div className="space-y-1.5">
        <div className="grid grid-cols-7 gap-1 text-[10px] font-bold text-center" style={{ color: muted }}>{["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => <span key={i}>{d}</span>)}</div>
        <div className="grid grid-cols-7 gap-1">{Array.from({ length: 21 }, (_, i) => { const tone = i === 5 ? "var(--mint)" : i === 12 ? "var(--sun)" : i === 19 ? "var(--mint)" : null; return <span key={i} className="h-7 rounded-md text-[10px] font-bold grid place-items-center" style={{ background: tone ?? "var(--paper-2)", color: ink }}>{i + 1}</span>; })}</div>
        <div className="flex gap-2 text-[11px] font-bold"><Pill color="var(--sun)">Aguardando sinal</Pill><Pill>Confirmada</Pill></div>
      </div>
    ),
  },
  {
    icon: <FileSignature className="h-4 w-4" />, eyebrow: "Contrato",
    title: "O contrato se escreve sozinho.",
    text: "Seu modelo preenchido com cliente, data, itens e parcelas no momento do aceite. O cliente lê e aceita pelo link.",
    mock: (
      <div className="rounded-xl bg-white p-3 text-[11px] leading-relaxed space-y-1" style={{ color: ink }}>
        <p className="font-extrabold">CONTRATO Nº 12</p>
        <p>CONTRATANTE: <b>Carla Mendes</b> · CPF ···789</p>
        <p>EVENTO: Aniversário da Júlia · <b>06/10 · 15h–19h</b> · 65 pessoas</p>
        <p>VALOR: <b>R$ 4.525,00</b> · 30% no aceite, 70% até 7 dias antes</p>
        <p className="pt-1"><Pill>Aceito pela cliente · 01/10 11:56</Pill></p>
      </div>
    ),
  },
  {
    icon: <MessageCircle className="h-4 w-4" />, eyebrow: "Cobrança",
    title: "Cobrar sem constrangimento.",
    text: "Parcelas, extras do dia e saldo com um botão: mensagem pronta no WhatsApp, Pix do valor exato e link da reserva.",
    mock: (
      <div className="space-y-2">
        <div className="rounded-2xl rounded-bl-sm bg-white p-3 text-xs max-w-[85%]" style={{ color: ink }}>Oi, Carla! Segue o que ficou em aberto da festa da Júlia:<br />• Pedidos extras: <b>R$ 180,00</b><br />Pix copia e cola: <span style={{ color: muted }}>00020126…</span></div>
        <div className="flex gap-2 text-[11px] font-bold"><Pill color="var(--berry)"><span className="text-white">Cobrar R$ 180,00</span></Pill><Pill>Recebida</Pill></div>
      </div>
    ),
  },
  {
    icon: <DoorOpen className="h-4 w-4" />, eyebrow: "Portaria",
    title: "Quem está na porta resolve no celular.",
    text: "Marca quem chegou, adiciona convidado de última hora, registra o bolo extra e fecha a conta com Pix antes de a festa acabar.",
    mock: (
      <div className="space-y-1.5 text-sm">
        {[["Família Oliveira", "2A 2C", true], ["Tia Lúcia", "2A", true], ["Pedro e Bia", "2A 1C", false]].map(([n, p, ok]) => <div key={String(n)} className="flex items-center justify-between rounded-xl bg-white px-3 py-1.5"><span className="font-bold">{ok ? <Check className="inline h-4 w-4 mr-1" style={{ color: "var(--mint)" }} /> : null}{String(n)} <span style={{ color: muted }}>· {String(p)}</span></span><span className="rounded-full px-2 py-0.5 text-[11px] font-extrabold" style={{ background: ok ? "var(--paper-2)" : ink, color: ok ? muted : "#fff" }}>{ok ? "Chegou" : "Marcar"}</span></div>)}
        <div className="flex items-center justify-between rounded-xl px-3 py-1.5 text-xs font-extrabold" style={{ background: "var(--sun)", color: ink }}><span>Fechar conta · extras R$ 220</span><span>Recebido · Pix</span></div>
      </div>
    ),
  },
]; }

/** Hero carousel: one slide per core feature, with a hand-built mock. Auto-advances, pauses on hover. */
export function HeroSlides() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setI((v) => (v + 1) % SLIDES.length), 6000);
    return () => clearInterval(t);
  }, [paused]);
  const SLIDES = slides();
  const s = SLIDES[i];
  return (
    <div className="relative" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} aria-roledescription="carrossel" aria-label="Principais recursos">
      <div className="grid gap-6 md:grid-cols-[1fr_1fr] md:items-center">
        <div className="md:min-h-[280px] flex flex-col justify-center">
          <div key={`t${i}`} className="hero-fade">
            <p className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide" style={{ background: "var(--sun)", color: ink }}>{s.icon} {s.eyebrow}</p>
            <h2 className="display font-extrabold text-3xl sm:text-4xl leading-[1.05] mt-4">{s.title}</h2>
            <p className="mt-3 text-base/relaxed" style={{ color: "#cfd2e6" }}>{s.text}</p>
          </div>
          <div className="mt-6 flex items-center gap-3">
        <button type="button" onClick={() => setI((i - 1 + SLIDES.length) % SLIDES.length)} className="h-10 w-10 rounded-full grid place-items-center ring-2 ring-inset ring-white/30 hover:bg-white/10" aria-label="Anterior"><ChevronLeft className="h-5 w-5" /></button>
        <div className="flex gap-2" role="tablist">
          {SLIDES.map((sl, k) => <button key={sl.eyebrow} type="button" role="tab" aria-selected={k === i} aria-label={sl.eyebrow} onClick={() => setI(k)} className="h-2.5 rounded-full transition-all" style={{ width: k === i ? 28 : 10, background: k === i ? "var(--sun)" : "rgba(255,255,255,0.35)" }} />)}
        </div>
        <button type="button" onClick={() => setI((i + 1) % SLIDES.length)} className="h-10 w-10 rounded-full grid place-items-center ring-2 ring-inset ring-white/30 hover:bg-white/10" aria-label="Próximo"><ChevronRight className="h-5 w-5" /></button>
            <span className="text-xs ml-auto tabular-nums" style={{ color: "#9da1bd" }}>{i + 1}/{SLIDES.length}</span>
          </div>
        </div>
        <div key={`m${i}`} className="hero-fade polaroid bg-white p-3 pb-4 rounded-sm shadow-[0_24px_60px_rgba(0,0,0,0.45)] mx-auto w-full max-w-sm" style={{ transform: "rotate(-1.5deg)", color: ink }}>
          <div className="rounded-xl p-3 min-h-[230px] flex flex-col justify-center" style={{ background: "var(--paper)" }}>{s.mock}</div>
          <p className="mt-3 text-sm font-semibold">{s.eyebrow}</p>
        </div>
      </div>
    </div>
  );
}
