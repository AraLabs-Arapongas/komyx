"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Check, QrCode, Calendar, FileSignature, DoorOpen, Calculator, MessageCircle, Bell, Download, Users, Plus } from "lucide-react";

type Slide = { key: string; icon: ReactNode; eyebrow: string; title: string; text: string; caption: string; phone?: boolean; screen: ReactNode };

/* Palette of the product UI inside the mocks (the app itself, not the invitation theme). */
const ui = { bg: "#faf7f2", card: "#ffffff", line: "#e7e2da", ink: "#1c1917", muted: "#78716c", brand: "#c2410c", brandSoft: "#fff1e8", green: "#065f46", greenBg: "#d1fae5", amber: "#92400e", amberBg: "#fef3c7", navy: "#1b1f3a" };

const T = ({ children, muted, bold, size = 11, color }: { children: ReactNode; muted?: boolean; bold?: boolean; size?: number; color?: string }) => (
  <span style={{ fontSize: size, color: color ?? (muted ? ui.muted : ui.ink), fontWeight: bold ? 700 : 500, lineHeight: 1.25 }}>{children}</span>
);
const Badge = ({ children, tone = "green" }: { children: ReactNode; tone?: "green" | "amber" | "zinc" | "brand" }) => {
  const m = { green: [ui.greenBg, ui.green], amber: [ui.amberBg, ui.amber], zinc: ["#e7e5e4", "#57534e"], brand: [ui.brandSoft, ui.brand] }[tone];
  return <span className="inline-flex items-center rounded-full px-1.5 py-[2px] whitespace-nowrap" style={{ background: m[0], color: m[1], fontSize: 9, fontWeight: 700 }}>{children}</span>;
};
const Btn = ({ children, solid, small }: { children: ReactNode; solid?: boolean; small?: boolean }) => (
  <span className="inline-flex items-center gap-1 rounded-lg whitespace-nowrap" style={{ background: solid ? ui.brand : ui.brandSoft, color: solid ? "#fff" : ui.brand, fontSize: small ? 9 : 10, fontWeight: 700, padding: small ? "3px 7px" : "5px 9px" }}>{children}</span>
);
const Card = ({ children, className = "", style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) => (
  <div className={`rounded-xl ${className}`} style={{ background: ui.card, border: `1px solid ${ui.line}`, padding: 8, ...style }}>{children}</div>
);
const Row = ({ children, last }: { children: ReactNode; last?: boolean }) => (
  <div className="flex items-center justify-between gap-2" style={{ padding: "5px 0", borderBottom: last ? "none" : `1px solid ${ui.line}` }}>{children}</div>
);

/* ---------- Screens ---------- */

function OrcamentoScreen() {
  const steps = ["Pacote", "Data", "Pessoas", "Seus dados", "Revisão"];
  return (
    <div className="h-full flex flex-col" style={{ background: "#fffdf7", color: ui.navy, fontFamily: "inherit" }}>
      <div className="px-4 pt-3 pb-2">
        <p style={{ fontWeight: 800, fontSize: 15, color: ui.navy }}>Monte seu orçamento</p>
        <p style={{ fontSize: 10, color: "#5b5f7a" }}>Festa & Cia Buffet</p>
        <div className="flex gap-1 mt-2">{steps.map((s, i) => <span key={s} className="rounded-full whitespace-nowrap" style={{ fontSize: 9, fontWeight: 800, padding: "3px 7px", background: i === 0 ? ui.navy : "#fff4e3", color: i === 0 ? "#fff" : ui.navy }}>{i + 1} {s}</span>)}</div>
      </div>
      <div className="px-4 space-y-1.5 flex-1">
        {[["Pacote Bronze", "20 adultos + 20 crianças", "R$ 2.500", false], ["Pacote Prata", "30 adultos + 30 crianças · bolo e mesa de frutas", "R$ 3.900", true], ["Pacote Ouro", "40 adultos + 40 crianças · open bar e fotógrafo", "R$ 5.900", false]].map(([n, d, v, sel]) => (
          <div key={String(n)} className="rounded-xl px-3 py-1.5 flex items-center justify-between gap-2" style={{ background: "#fff", border: `2px solid ${sel ? "#e8356d" : "#ece7dc"}` }}>
            <div className="min-w-0"><p style={{ fontWeight: 800, fontSize: 12 }}>{String(n)}</p><p className="truncate" style={{ fontSize: 9, color: "#5b5f7a" }}>{String(d)}</p></div>
            <span style={{ fontWeight: 800, fontSize: 12, color: "#e8356d" }}>{String(v)}</span>
          </div>
        ))}
        <div className="flex gap-1.5 pt-1">{["Safári", "Princesas", "Super-heróis", "Frozen"].map((t, i) => <span key={t} className="rounded-lg" style={{ fontSize: 9, fontWeight: 700, padding: "3px 7px", background: i === 0 ? "#fde7ef" : "#fff", border: `1px solid ${i === 0 ? "#e8356d" : "#ece7dc"}`, color: ui.navy }}>{t}</span>)}</div>
      </div>
      <div className="mx-3 mb-3 mt-2 rounded-2xl px-3 py-2 flex items-center justify-between" style={{ background: ui.navy, color: "#fff" }}>
        <div><p style={{ fontWeight: 800, fontSize: 15 }}>R$ 3.900 <span style={{ fontSize: 9, fontWeight: 500, opacity: 0.8 }}>estimado</span></p><p style={{ fontSize: 9, opacity: 0.8 }}>Pacote Prata · Safári · 30A 30C</p></div>
        <span className="rounded-full" style={{ background: "#e8356d", fontSize: 10, fontWeight: 800, padding: "6px 12px" }}>Continuar</span>
      </div>
    </div>
  );
}

function AgendaScreen() {
  const days = Array.from({ length: 35 }, (_, i) => i - 3); // starts on a Thursday
  const events: Record<number, [string, "green" | "amber" | "zinc"]> = { 1: ["18:00 Chá revelação", "green"], 6: ["15:00 Júlia", "green"], 13: ["11:00 Theo", "amber"], 20: ["16:00 Fernanda", "amber"], 31: ["19:00 Firma", "zinc"] };
  const tone = { green: [ui.greenBg, ui.green], amber: [ui.amberBg, ui.amber], zinc: ["#f5f5f4", "#78716c"] };
  return (
    <div className="h-full flex flex-col" style={{ background: ui.bg, color: ui.ink }}>
      <div className="px-3 pt-2.5 pb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2"><ChevronLeft className="h-3.5 w-3.5" style={{ color: ui.muted }} /><T bold size={12}>Outubro de 2026</T><ChevronRight className="h-3.5 w-3.5" style={{ color: ui.muted }} /></div>
        <div className="flex rounded-lg p-[2px]" style={{ background: "#fff", border: `1px solid ${ui.line}` }}>{["Lista", "Semana", "Mês"].map((v, i) => <span key={v} className="rounded-md" style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", background: i === 2 ? ui.brand : "transparent", color: i === 2 ? "#fff" : ui.muted }}>{v}</span>)}</div>
      </div>
      <div className="grid grid-cols-7 px-3" style={{ fontSize: 8, color: ui.muted, fontWeight: 700, textTransform: "uppercase" }}>{["dom", "seg", "ter", "qua", "qui", "sex", "sáb"].map((d) => <span key={d} className="text-center">{d}</span>)}</div>
      <div className="grid grid-cols-7 gap-[3px] px-3 pb-3 flex-1" style={{ gridAutoRows: "1fr" }}>
        {days.map((d, i) => { const inMonth = d >= 1 && d <= 31; const ev = events[d]; return (
          <div key={i} className="rounded-md px-[3px] py-[2px] overflow-hidden" style={{ background: "#fff", border: `1px solid ${d === 1 ? ui.brand : ui.line}` }}>
            <span style={{ fontSize: 8, fontWeight: 700, color: inMonth ? ui.ink : "#c7c2ba" }}>{inMonth ? d : d < 1 ? 30 + d : d - 31}</span>
            {ev ? <div className="rounded-sm truncate mt-[2px]" style={{ fontSize: 7, fontWeight: 700, padding: "1px 3px", background: tone[ev[1]][0], color: tone[ev[1]][1] }}>{ev[0]}</div> : null}
          </div>
        ); })}
      </div>
    </div>
  );
}

function ContratoScreen() {
  return (
    <div className="h-full flex flex-col" style={{ background: ui.bg, color: ui.ink }}>
      <div className="px-3 pt-2.5 pb-1.5 flex items-center justify-between">
        <div><T bold size={12}>Contrato nº 12</T><br /><T muted size={9}>Festa do Theo · gerado no aceite do orçamento</T></div>
        <Badge tone="green">Aceito pelo cliente</Badge>
      </div>
      <div className="px-3 flex gap-1.5"><Btn solid small><Download className="h-3 w-3" /> Baixar PDF</Btn><Btn small><MessageCircle className="h-3 w-3" /> WhatsApp</Btn><Btn small>Copiar link</Btn></div>
      <div className="mx-3 mt-2 mb-3 flex-1 rounded-xl overflow-hidden" style={{ background: "#fff", border: `1px solid ${ui.line}`, padding: "9px 11px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 8.5, lineHeight: 1.5, color: ui.ink }}>
        <p style={{ fontWeight: 700 }}>CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE BUFFET</p>
        <p className="mt-1">CONTRATADA: <b>Festa & Cia Eventos Ltda</b>, CNPJ 12.345.678/0001-90.</p>
        <p>CONTRATANTE: <b>Roberto Lima</b>, WhatsApp (11) 99999-0002.</p>
        <p className="mt-1" style={{ fontWeight: 700 }}>1. OBJETO</p>
        <p>Festa “Festa do Theo” em <b>13/10/2026</b>, das 11:00 às 15:00, para 20 adultos e 20 crianças, conforme <b>Pacote Bronze</b>.</p>
        <p className="mt-1" style={{ fontWeight: 700 }}>2. VALOR E PAGAMENTO</p>
        <p>Total <b>R$ 2.500,00</b>: 30% na aceitação (R$ 750,00) e 70% até 7 dias antes (R$ 1.750,00).</p>
        <p className="mt-1" style={{ fontWeight: 700 }}>3. ITENS CONTRATADOS</p>
        <p>Pacote Bronze (buffet de salgados e doces, refrigerantes e sucos, 3h de festa, 1 monitor) · Hora extra × 1.</p>
        <p className="mt-1" style={{ fontWeight: 700 }}>4. CANCELAMENTO</p>
        <p>Até 30 dias antes, devolução de 50% do sinal; após, o sinal é retido para cobrir a data reservada.</p>
        <p className="mt-2" style={{ color: ui.muted }}>Aceito online por Roberto Lima em 01/10/2026 às 11:56 · IP registrado</p>
      </div>
    </div>
  );
}

function PagamentosScreen() {
  const rows: [string, string, "green" | "amber" | "zinc", string][] = [["1. Sinal na aceitação", "na aceitação", "green", "Paga"], ["2. Saldo", "29/09/2026", "green", "Paga"], ["3. Extras na festa", "no dia", "amber", "Parcial"]];
  return (
    <div className="h-full flex flex-col" style={{ background: ui.bg, color: ui.ink }}>
      <div className="px-3 pt-2.5 pb-2 flex items-center justify-between">
        <div><T bold size={12}>Pagamentos</T><br /><T muted size={9}>Pago R$ 4.735,00 · falta receber R$ 10,00</T></div>
        <Btn solid small><MessageCircle className="h-3 w-3" /> Cobrar R$ 10,00</Btn>
      </div>
      <div className="mx-3 mb-3 flex-1 flex flex-col"><Card className="flex-1">
        <T bold size={10}>Parcelas</T>
        {rows.map(([n, d, tone, label], i) => (
          <Row key={n} last={i === rows.length - 1}>
            <div className="flex items-center gap-1.5 min-w-0"><Check className="h-3 w-3 shrink-0" style={{ color: tone === "green" ? "#059669" : "#d6d3d1" }} /><T size={10} bold>{n}</T><T muted size={9}>· {d}</T><Badge tone={tone}>{label}</Badge></div>
            <div className="flex items-center gap-1.5 shrink-0">{tone === "amber" ? <><span style={{ fontSize: 10, fontWeight: 700, color: ui.amber }}>Falta R$ 10,00</span><span className="rounded-md" style={{ background: "#059669", color: "#fff", fontSize: 9, fontWeight: 700, padding: "3px 7px" }}>Recebida</span></> : <T size={10} bold>{i === 0 ? "R$ 1.357,50" : "R$ 3.167,50"}</T>}</div>
          </Row>
        ))}
        <div className="mt-1.5"><T bold size={10}>Recebimentos</T></div>
        {[["R$ 1.300,00", "Pix · 11/09 · Entrada 30%"], ["R$ 2.967,50", "Pix · 01/10 · Parcela 2 · Saldo"], ["R$ 210,00", "Pix · 01/10 · Parcela 3 · Pedidos extras"]].map(([v, d], i) => <Row key={v} last={i === 2}><div><T size={10} bold>{v}</T> <T muted size={9}>· {d}</T></div><T muted size={9}>Remover</T></Row>)}
      </Card></div>
    </div>
  );
}

function ReservaScreen() {
  return (
    <div className="h-full flex flex-col" style={{ background: "#fffdf7", color: ui.navy }}>
      <div className="px-3 pt-1 pb-1.5 flex items-center justify-between"><div><p style={{ fontSize: 9, color: "#5b5f7a" }}>Festa & Cia Buffet</p><p style={{ fontWeight: 800, fontSize: 13 }}>Festa do Theo</p></div><span className="rounded-full" style={{ background: "#ffc43d", fontSize: 9, fontWeight: 800, padding: "2px 7px" }}>Reservada</span></div>
      <div className="mx-3 rounded-xl px-2.5 py-1.5" style={{ background: "#fff", border: "1px solid #ece7dc" }}><p style={{ fontSize: 10, fontWeight: 700 }}>ter., 13 de out. · 11:00–15:00</p><p style={{ fontSize: 9, color: "#5b5f7a" }}>20 adultos · 20 crianças · Bronze</p><p style={{ fontSize: 9, color: "#b45309", fontWeight: 700 }}>Data segura até sáb 17:32</p></div>
      <div className="mx-3 mt-1.5 rounded-xl p-2 flex items-center gap-2" style={{ background: "#fff4e3" }}>
        <span className="h-[52px] w-[52px] shrink-0 rounded-lg bg-white grid place-items-center"><QrCode className="h-8 w-8" style={{ color: ui.navy }} /></span>
        <div className="min-w-0" style={{ fontSize: 9, color: "#5b5f7a", lineHeight: 1.3 }}><p className="whitespace-nowrap" style={{ fontWeight: 800, fontSize: 10.5, color: ui.navy }}>Pagar o sinal · R$ 750</p><p>Chave 12.345.678/0001-90</p><p>Identificador <b style={{ color: ui.navy }}>FESTABBBBBBBB00</b></p></div>
      </div>
      <span className="mx-3 mt-1.5 block text-center rounded-full py-[5px]" style={{ background: "#e8356d", color: "#fff", fontSize: 10, fontWeight: 800 }}>Copiar Pix copia e cola</span>
      <div className="mx-3 mt-1.5 rounded-xl px-2.5 py-1.5" style={{ background: "#fff", border: "1px solid #ece7dc", fontSize: 9 }}>
        <div className="flex justify-between"><span style={{ fontWeight: 700 }}>Orçamento</span><span style={{ fontWeight: 800 }}>R$ 2.500</span></div>
        <div className="flex justify-between" style={{ color: "#5b5f7a" }}><span>1. Sinal · na aceitação</span><span>R$ 750</span></div>
        <div className="flex justify-between" style={{ color: "#5b5f7a" }}><span>2. Saldo · até 06/10</span><span>R$ 1.750</span></div>
      </div>
      <div className="mx-3 mt-1.5 flex items-center justify-between rounded-xl px-2.5 py-1.5" style={{ background: "#fff", border: "1px solid #ece7dc", fontSize: 9 }}><span style={{ fontWeight: 700 }}>Contrato nº 12</span><span className="rounded-full px-2 py-[2px]" style={{ background: "#fde7ef", color: "#c2184f", fontWeight: 800 }}>Ler e aceitar</span></div>
    </div>
  );
}

function PortariaScreen() {
  const guests: [string, string, boolean][] = [["Fam. Oliveira", "2A 2C", true], ["Tia Lúcia", "2A", true], ["Pedro e Bia", "2A 1C", false]];
  return (
    <div className="h-full flex flex-col" style={{ background: ui.bg, color: ui.ink }}>
      <div className="px-3 pt-1 pb-1"><T muted size={8}>FESTA & CIA · PORTARIA</T><br /><T bold size={13}>Aniversário da Júlia</T></div>
      <div className="mx-3 grid grid-cols-3 gap-1">{[["Presentes", "42"], ["Faltam", "23"], ["Confirmados", "65"]].map(([l, v]) => <div key={l} className="rounded-lg text-center py-1" style={{ background: "#fff", border: `1px solid ${ui.line}` }}><p style={{ fontSize: 8, color: ui.muted }}>{l}</p><p style={{ fontSize: 13, fontWeight: 800 }}>{v}</p></div>)}</div>
      <div className="mx-3 mt-1.5 flex gap-1">{["Aguardando (23)", "Chegaram (42)", "Pedidos (3)"].map((t, i) => <span key={t} className="rounded-full whitespace-nowrap" style={{ fontSize: 8, fontWeight: 700, padding: "2px 7px", background: i === 0 ? ui.brand : "#fff", color: i === 0 ? "#fff" : ui.muted, border: `1px solid ${i === 0 ? ui.brand : ui.line}` }}>{t}</span>)}</div>
      <div className="mx-3 mt-1.5 space-y-1 flex-1">
        {guests.map(([n, p, ok]) => <div key={n} className="flex items-center justify-between rounded-lg px-2 py-1" style={{ background: "#fff", border: `1px solid ${ui.line}` }}><span className="truncate" style={{ fontSize: 10, fontWeight: 700 }}>{ok ? <Check className="inline h-3 w-3 mr-1" style={{ color: "#059669" }} /> : null}{n} <span style={{ color: ui.muted, fontWeight: 500 }}>· {p}</span></span>{ok ? <Badge tone="zinc">Chegou</Badge> : <Btn small>Chegou</Btn>}</div>)}
        <div className="flex items-center gap-1.5 rounded-lg px-2 py-1" style={{ border: `1px dashed ${ui.line}`, color: ui.muted, fontSize: 9 }}><Plus className="h-3 w-3" /> Convidado extra</div>
      </div>
      <div className="mx-3 mb-2 mt-1.5 rounded-xl px-2.5 py-1.5" style={{ background: ui.amberBg, border: "1px solid #fcd34d" }}>
        <div className="flex items-center justify-between gap-2"><p className="whitespace-nowrap" style={{ fontSize: 10, fontWeight: 800, color: ui.amber }}>Fechar conta · R$ 180</p><span className="rounded-md whitespace-nowrap" style={{ background: "#059669", color: "#fff", fontSize: 9, fontWeight: 700, padding: "3px 7px" }}>Recebido · Pix</span></div>
        <p style={{ fontSize: 8, color: ui.amber }}>Bolo cenográfico · extra no dia</p>
      </div>
    </div>
  );
}

const SLIDES: Slide[] = [
  { key: "orcamento", icon: <Calculator className="h-4 w-4" />, eyebrow: "Orçamento online", title: "O cliente monta o orçamento em 2 minutos.", text: "Pacote, tema, data no calendário com os dias ocupados, quantas pessoas. Ele vê o valor na hora e você recebe a solicitação pronta para virar evento, sem redigitar nada.", caption: "Página pública do buffet · passo 1 de 5", screen: <OrcamentoScreen /> },
  { key: "reserva", icon: <QrCode className="h-4 w-4" />, eyebrow: "Reserva com Pix", title: "A data fica segura com o sinal por Pix.", text: "QR e copia-e-cola com o valor exato e um identificador que aparece no seu extrato. Prazo que você define; passou, a data volta a ficar livre sozinha.", caption: "No celular do cliente", phone: true, screen: <ReservaScreen /> },
  { key: "agenda", icon: <Calendar className="h-4 w-4" />, eyebrow: "Agenda", title: "Uma festa por dia. Nunca duas.", text: "Mês inteiro numa tela: confirmadas em verde, aguardando sinal em amarelo, orçamentos sem data segura em cinza. Só a dona abre exceção, e confirmando.", caption: "Agenda da dona · visão Mês", screen: <AgendaScreen /> },
  { key: "contrato", icon: <FileSignature className="h-4 w-4" />, eyebrow: "Contrato automático", title: "O contrato se escreve sozinho e fica guardado.", text: "No aceite do orçamento, seu modelo é preenchido com cliente, data, itens e parcelas, numerado e registrado. O cliente lê e aceita pelo link. Nada redigido um a um.", caption: "Contrato gerado a partir do orçamento aceito", screen: <ContratoScreen /> },
  { key: "pagamentos", icon: <MessageCircle className="h-4 w-4" />, eyebrow: "Parcelas e cobrança", title: "Cada parcela e cada extra com o que falta.", text: "Sinal, saldo e pedidos do dia da festa com status paga, parcial ou em aberto. 'Recebida' registra na hora; 'Cobrar' abre o WhatsApp com a mensagem pronta e o Pix do valor exato.", caption: "Ficha do evento · Pagamentos", screen: <PagamentosScreen /> },
  { key: "portaria", icon: <DoorOpen className="h-4 w-4" />, eyebrow: "Dia da festa", title: "Quem está na porta resolve pelo celular.", text: "Marca quem chegou, adiciona convidado de última hora, registra o bolo extra e fecha a conta com Pix antes de a festa acabar. Sem ligar para a dona.", caption: "No celular de quem está na porta", phone: true, screen: <PortariaScreen /> },
];

function Device({ s }: { s: Slide }) {
  if (s.phone) {
    return (
      <div className="mx-auto h-[372px] w-[232px] rounded-[1.9rem] p-1.5 shadow-[0_30px_70px_rgba(0,0,0,0.5)] ring-1 ring-white/10" style={{ background: "#0f1330" }}>
        <div className="relative h-full w-full rounded-[1.55rem] overflow-hidden pt-4" style={{ background: "#fffdf7" }}>
          <span className="absolute left-1/2 top-1.5 h-1.5 w-14 -translate-x-1/2 rounded-full" style={{ background: "#0f1330" }} />
          <div className="h-full">{s.screen}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="h-[372px] w-full rounded-2xl overflow-hidden shadow-[0_30px_70px_rgba(0,0,0,0.5)] ring-1 ring-white/10 flex flex-col" style={{ background: "#0f1330" }}>
      <div className="flex items-center gap-1.5 px-2.5 h-6 shrink-0"><span className="h-2 w-2 rounded-full bg-[#ff5f57]" /><span className="h-2 w-2 rounded-full bg-[#febc2e]" /><span className="h-2 w-2 rounded-full bg-[#28c840]" /><span className="ml-2 h-3 flex-1 rounded-md bg-white/10" /></div>
      <div className="flex-1 min-h-0">{s.screen}</div>
    </div>
  );
}

/** Hero carousel: one slide per core feature, each with a full mock screen in a window or phone frame. */
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
    <div className="relative" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} aria-roledescription="carrossel" aria-label="Principais recursos">
      <div className="grid gap-6 md:grid-cols-[0.95fr_1.05fr] md:items-center">
        <div className="md:min-h-[380px] flex flex-col justify-center">
          <div key={`t${i}`} className="hero-fade">
            <p className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide" style={{ background: "var(--sun)", color: "var(--ink)" }}>{s.icon} {s.eyebrow}</p>
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
        <div key={`m${i}`} className="hero-fade mx-auto w-full max-w-md" style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif" }}>
          <Device s={s} />
          <p className="mt-3 text-sm font-semibold flex items-center justify-center gap-1.5" style={{ color: "#cfd2e6" }}>{s.phone ? <Users className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />} {s.caption}</p>
        </div>
      </div>
    </div>
  );
}
