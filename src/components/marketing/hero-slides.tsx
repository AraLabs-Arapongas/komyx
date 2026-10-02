"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Calculator, QrCode, Calendar, FileSignature, MessageCircle, DoorOpen } from "lucide-react";

type Slide = { key: string; Icon: typeof Calculator; eyebrow: string; title: string; text: string; image: string; frame: "desktop" | "phone"; alt: string };

const SLIDES: Slide[] = [
  { key: "home", Icon: Calendar, eyebrow: "Início do dia", title: "Abre o app e já sabe o que fazer.", text: "Reservas vencendo, pedidos de orçamento novos, a festa de hoje e quanto falta receber. Confirmar, liberar data e responder no WhatsApp, tudo com um toque.", image: "/landing/home.png", frame: "desktop", alt: "Tela inicial do Festeja com ação urgente e novas solicitações" },
  { key: "orcamento", Icon: Calculator, eyebrow: "Orçamento online", title: "O cliente monta o orçamento sozinho, em 2 minutos.", text: "Pacote, tema, data no calendário com os dias já ocupados, quantas pessoas. Vê o valor na hora e chega para você como solicitação pronta para virar evento, sem redigitar nada.", image: "/landing/orcamento.png", frame: "desktop", alt: "Passo da data no orçamento online, com calendário e dias ocupados" },
  { key: "reserva", Icon: QrCode, eyebrow: "Reserva com Pix", title: "A data fica segura com o sinal por Pix.", text: "QR e copia-e-cola com o valor exato e um identificador que aparece no seu extrato. Prazo que você define; passou, a data volta a ficar livre sozinha. O cliente acompanha tudo pelo link dele.", image: "/landing/reserva.png", frame: "phone", alt: "Página da reserva do cliente com orçamento, parcelas e link permanente" },
  { key: "contrato", Icon: FileSignature, eyebrow: "Contrato automático", title: "O contrato se escreve sozinho e fica guardado.", text: "No aceite do orçamento, o Festeja preenche o seu modelo com cliente, data, itens e parcelas, numera, registra e manda o link para o cliente aceitar. Nada redigido um a um, nada perdido em pasta.", image: "/landing/contrato.png", frame: "desktop", alt: "Contrato gerado automaticamente a partir do orçamento aceito" },
  { key: "pagamentos", Icon: MessageCircle, eyebrow: "Parcelas e cobrança", title: "Cada parcela, cada extra, com o que falta e um botão Cobrar.", text: "Sinal, saldo e pedidos do dia da festa com status paga, parcial ou em aberto. 'Recebida' registra; 'Cobrar' abre o WhatsApp com a mensagem pronta e o Pix do valor exato.", image: "/landing/pagamentos.png", frame: "desktop", alt: "Card de pagamentos com parcelas, recebimentos e botão Cobrar" },
  { key: "portaria", Icon: DoorOpen, eyebrow: "Dia da festa", title: "Quem está na porta resolve pelo celular.", text: "Marca quem chegou, adiciona convidado de última hora, registra o bolo extra e fecha a conta com Pix antes de a festa acabar. Sem ligar para a dona.", image: "/landing/portaria.png", frame: "phone", alt: "Portaria no celular com pedidos extras e fechar conta" },
];

function Frame({ s }: { s: Slide }) {
  if (s.frame === "phone") {
    return (
      <div className="mx-auto h-[420px] w-[214px] rounded-[2rem] p-2 shadow-[0_24px_60px_rgba(0,0,0,0.45)]" style={{ background: "#0b0e22" }}>
        <div className="h-full w-full rounded-[1.6rem] overflow-hidden bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.image} alt={s.alt} className="h-full w-full object-cover object-top" />
        </div>
      </div>
    );
  }
  return (
    <div className="h-[420px] w-full rounded-2xl overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.45)] flex flex-col" style={{ background: "#0b0e22" }}>
      <div className="flex items-center gap-1.5 px-3 h-8 shrink-0"><span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" /><span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" /><span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" /><span className="ml-3 h-4 flex-1 rounded-md bg-white/10" /></div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={s.image} alt={s.alt} className="flex-1 min-h-0 w-full object-cover object-left-top bg-white" />
    </div>
  );
}

/** Hero carousel: one slide per core feature with a real product screenshot. Fixed height, auto-advances, pauses on hover. */
export function HeroSlides() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setI((v) => (v + 1) % SLIDES.length), 7000);
    return () => clearInterval(t);
  }, [paused]);
  const s = SLIDES[i];
  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} aria-roledescription="carrossel" aria-label="Principais recursos">
      <div className="grid gap-8 md:grid-cols-[0.95fr_1.05fr] md:items-center">
        <div className="md:min-h-[300px] flex flex-col justify-center">
          <div key={s.key} className="hero-fade">
            <p className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide" style={{ background: "var(--sun)", color: "var(--ink)" }}><s.Icon className="h-4 w-4" /> {s.eyebrow}</p>
            <h2 className="display font-extrabold text-3xl sm:text-4xl leading-[1.05] mt-4">{s.title}</h2>
            <p className="mt-3 text-base/relaxed" style={{ color: "#cfd2e6" }}>{s.text}</p>
          </div>
          <div className="mt-6 flex items-center gap-3">
            <button type="button" onClick={() => setI((i - 1 + SLIDES.length) % SLIDES.length)} className="h-10 w-10 rounded-full grid place-items-center ring-2 ring-inset ring-white/30 hover:bg-white/10" aria-label="Anterior"><ChevronLeft className="h-5 w-5" /></button>
            <div className="flex gap-2" role="tablist">
              {SLIDES.map((sl, k) => <button key={sl.key} type="button" role="tab" aria-selected={k === i} aria-label={sl.eyebrow} onClick={() => setI(k)} className="h-2.5 rounded-full transition-all" style={{ width: k === i ? 28 : 10, background: k === i ? "var(--sun)" : "rgba(255,255,255,0.35)" }} />)}
            </div>
            <button type="button" onClick={() => setI((i + 1) % SLIDES.length)} className="h-10 w-10 rounded-full grid place-items-center ring-2 ring-inset ring-white/30 hover:bg-white/10" aria-label="Próximo"><ChevronRight className="h-5 w-5" /></button>
            <span className="text-xs ml-auto tabular-nums" style={{ color: "#9da1bd" }}>{i + 1}/{SLIDES.length}</span>
          </div>
        </div>
        <div key={`f${s.key}`} className="hero-fade h-[420px]">
          <Frame s={s} />
        </div>
      </div>
    </div>
  );
}
