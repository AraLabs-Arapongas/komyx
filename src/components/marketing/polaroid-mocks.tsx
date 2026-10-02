import { Check, MapPin, MessageCircle, Star, Users } from "lucide-react";

/**
 * "Bonito por fora" strip on the landing: polaroids holding JSX mocks of what the end client sees
 * (buffet page, invitation, themes, RSVP). Placeholder until real party photos exist.
 * Each mock is laid out at 320×256 and scaled to 0.75 below sm.
 */
const tilts = ["-3deg", "2deg", "-1.5deg", "2.5deg"];
const ink = "#1b1f3a", paper = "#fffdf7", paper2 = "#fff4e3", berry = "#e8356d", sun = "#ffc43d", mint = "#2ec4a6", sky = "#4cb5f5";

function Bunting() {
  const colors = [berry, sun, mint, sky, berry, sun, mint, sky, berry, sun];
  return (
    <svg viewBox="0 0 320 22" className="w-full h-[22px] block" aria-hidden="true">
      <path d="M0 3 Q160 20 320 3" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
      {colors.map((c, i) => { const x = 8 + i * 32; const y = 3 + Math.sin((i / 9) * Math.PI) * 8; return <path key={i} d={`M${x} ${y} L${x + 20} ${y} L${x + 10} ${y + 16} Z`} fill={c} />; })}
    </svg>
  );
}

/** Scene stand-in for a party photo: color blocks and confetti dots, deterministic. */
function Scene({ a, b, seed = 1, className = "" }: { a: string; b: string; seed?: number; className?: string }) {
  const dots = Array.from({ length: 14 }, (_, i) => ({ x: ((i * 37 + seed * 11) % 100), y: ((i * 53 + seed * 7) % 100), r: 2 + ((i + seed) % 3), c: [berry, sun, mint, sky, "#fff"][(i + seed) % 5] }));
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={`block ${className}`} aria-hidden="true">
      <rect width="100" height="100" fill={a} />
      <path d="M0 62 L100 48 L100 100 L0 100 Z" fill={b} />
      {dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.c} opacity="0.9" />)}
      <ellipse cx="22" cy="78" rx="8" ry="10" fill="#fff" opacity="0.95" /><ellipse cx="70" cy="74" rx="9" ry="11" fill="#fff" opacity="0.95" />
    </svg>
  );
}

function BuffetPage() {
  return (
    <div className="h-full w-full flex flex-col" style={{ background: paper, color: ink, fontSize: 9 }}>
      <div style={{ background: ink, color: paper }}>
        <Bunting />
        <div className="px-3 pb-2.5 -mt-1 flex items-start justify-between gap-2">
          <div>
            <p className="font-extrabold uppercase tracking-wide" style={{ color: sun, fontSize: 8 }}>Festa & Cia Buffet</p>
            <p className="font-extrabold leading-tight" style={{ fontSize: 15 }}>A festa que seu filho<br />vai lembrar.</p>
            <p className="mt-1 flex items-center gap-1" style={{ color: "#cfd2e6", fontSize: 8 }}><MapPin className="h-2.5 w-2.5" /> Rua das Flores, 120 · Campinas</p>
          </div>
          <span className="rounded-full px-2 py-1 font-extrabold shrink-0" style={{ background: berry, fontSize: 8 }}>Monte seu orçamento</span>
        </div>
      </div>
      <div className="px-3 pt-2 flex gap-1.5">{["Até 120 pessoas", "Espaço kids", "Estacionamento"].map((h) => <span key={h} className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-bold" style={{ background: paper2, fontSize: 7.5 }}><Check className="h-2 w-2" style={{ color: mint }} /> {h}</span>)}</div>
      <div className="px-3 pt-2 grid grid-cols-3 gap-1.5 flex-1">
        {[["Bronze", "R$ 2.500", false], ["Prata", "R$ 3.900", true], ["Ouro", "R$ 5.900", false]].map(([n, v, hot]) => (
          <div key={String(n)} className="rounded-lg p-1.5 relative" style={{ background: hot ? ink : "#fff", color: hot ? paper : ink, border: `1px solid ${hot ? ink : "#ece7dc"}` }}>
            {hot ? <span className="absolute -top-1.5 right-1 rounded-full px-1 font-extrabold" style={{ background: sun, color: ink, fontSize: 6.5 }}>Mais pedido</span> : null}
            <p className="font-extrabold" style={{ fontSize: 9 }}>{String(n)}</p>
            <p className="font-extrabold" style={{ fontSize: 10, color: hot ? sun : berry }}>{String(v)}</p>
            <p style={{ fontSize: 7, opacity: 0.75 }}>30 adultos · 30 crianças</p>
          </div>
        ))}
      </div>
      <div className="px-3 py-2 flex items-center gap-1" style={{ fontSize: 7.5, color: "#5b5f7a" }}><Star className="h-2.5 w-2.5" style={{ color: sun }} /> “Melhor festa que já fizemos” · Mariana, mãe do Theo</div>
    </div>
  );
}

function Invite() {
  return (
    <div className="h-full w-full relative flex flex-col items-center justify-center text-center" style={{ background: ink, color: paper }}>
      <Scene a="#1b1f3a" b="#23285a" seed={3} className="absolute inset-0 h-full w-full opacity-60" />
      <div className="relative mx-5 rounded-2xl px-4 py-3 w-[240px]" style={{ background: paper, color: ink, boxShadow: "0 12px 30px rgba(0,0,0,0.35)" }}>
        <p className="font-extrabold uppercase tracking-[0.2em]" style={{ color: berry, fontSize: 7.5 }}>Você está convidado</p>
        <p className="font-extrabold leading-none mt-1" style={{ fontSize: 24 }}>Theo faz 5!</p>
        <p className="mt-1 font-bold" style={{ fontSize: 9 }}>Safári na selva 🦁</p>
        <div className="mt-2 grid grid-cols-2 gap-1" style={{ fontSize: 8 }}>
          <div className="rounded-lg py-1" style={{ background: paper2 }}><p style={{ fontSize: 6.5, color: "#5b5f7a" }}>Quando</p><p className="font-extrabold">13 de out · 11h</p></div>
          <div className="rounded-lg py-1" style={{ background: paper2 }}><p style={{ fontSize: 6.5, color: "#5b5f7a" }}>Onde</p><p className="font-extrabold">Festa & Cia Buffet</p></div>
        </div>
        <span className="mt-2 inline-block rounded-full px-3 py-1 font-extrabold text-white" style={{ background: berry, fontSize: 8.5 }}>Confirmar presença</span>
      </div>
    </div>
  );
}

function Themes() {
  const items: [string, string, string, boolean][] = [["Safári", "#2ec4a6", "#ffc43d", true], ["Princesas", "#e8356d", "#fde7ef", false], ["Super-heróis", "#4cb5f5", "#1b1f3a", false], ["Frozen", "#bfe6ff", "#4cb5f5", false], ["Dinossauros", "#7bc67e", "#2d6a4f", false], ["Circo", "#ff8a3d", "#e8356d", false]];
  return (
    <div className="h-full w-full flex flex-col" style={{ background: paper, color: ink }}>
      <div className="px-3 pt-2.5 pb-1.5 flex items-end justify-between"><div><p className="font-extrabold" style={{ fontSize: 12 }}>Escolha o tema</p><p style={{ fontSize: 8, color: "#5b5f7a" }}>Decoração inclusa no pacote · fotos reais do buffet</p></div><span style={{ fontSize: 8, fontWeight: 800, color: berry }}>Passo 2 de 5</span></div>
      <div className="px-3 pb-3 grid grid-cols-3 gap-1.5 flex-1">
        {items.map(([n, a, b, sel], i) => (
          <div key={n} className="rounded-lg overflow-hidden relative" style={{ border: `2px solid ${sel ? berry : "#ece7dc"}`, background: "#fff" }}>
            <Scene a={a} b={b} seed={i + 2} className="h-[62%] w-full" />
            <p className="px-1.5 py-1 font-extrabold" style={{ fontSize: 8 }}>{n}</p>
            {sel ? <span className="absolute top-1 right-1 h-3.5 w-3.5 rounded-full grid place-items-center text-white" style={{ background: berry }}><Check className="h-2.5 w-2.5" /></span> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function Rsvp() {
  return (
    <div className="h-full w-full flex items-center justify-center" style={{ background: paper2, color: ink }}>
      <div className="w-[150px] rounded-[18px] p-1.5" style={{ background: ink, boxShadow: "0 14px 30px rgba(27,31,58,0.35)" }}>
        <div className="rounded-[13px] overflow-hidden pt-3 px-2 pb-2 relative" style={{ background: paper }}>
          <span className="absolute left-1/2 top-1 h-1 w-9 -translate-x-1/2 rounded-full" style={{ background: ink }} />
          <p style={{ fontSize: 7, color: "#5b5f7a" }}>Festa do Theo · 13/10</p>
          <p className="font-extrabold leading-tight" style={{ fontSize: 11 }}>Oi, Fam. Oliveira! Vocês vão?</p>
          <div className="mt-1.5 grid grid-cols-2 gap-1">
            <span className="rounded-lg py-1 text-center font-extrabold text-white" style={{ background: mint, fontSize: 8 }}>Vamos sim 🎉</span>
            <span className="rounded-lg py-1 text-center font-bold" style={{ background: "#fff", border: "1px solid #ece7dc", fontSize: 8 }}>Não dá</span>
          </div>
          <div className="mt-1.5 rounded-lg px-2 py-1 flex items-center justify-between" style={{ background: "#fff", border: "1px solid #ece7dc", fontSize: 7.5 }}><span className="flex items-center gap-1"><Users className="h-2.5 w-2.5" /> Adultos</span><b>2</b></div>
          <div className="mt-1 rounded-lg px-2 py-1 flex items-center justify-between" style={{ background: "#fff", border: "1px solid #ece7dc", fontSize: 7.5 }}><span>Crianças</span><b>1</b></div>
          <span className="mt-1.5 block rounded-full py-1 text-center font-extrabold text-white" style={{ background: berry, fontSize: 8 }}>Confirmar</span>
          <p className="mt-1 flex items-center justify-center gap-1" style={{ fontSize: 6.5, color: "#5b5f7a" }}><MessageCircle className="h-2 w-2" /> Chegou pelo WhatsApp, sem app</p>
        </div>
      </div>
    </div>
  );
}

const ITEMS: { key: string; caption: string; mock: React.ReactNode }[] = [
  { key: "pagina", caption: "Sua página pública, com sua cara", mock: <BuffetPage /> },
  { key: "convite", caption: "Convite que o cliente personaliza", mock: <Invite /> },
  { key: "temas", caption: "Temas com foto no orçamento", mock: <Themes /> },
  { key: "rsvp", caption: "Convidado confirma pelo link", mock: <Rsvp /> },
];

export function PolaroidMocks() {
  const loop = [...ITEMS, ...ITEMS];
  return (
    <div className="-mx-4 overflow-hidden" aria-roledescription="carrossel" aria-label="O que o cliente vê">
      <ul className="flex gap-6 w-max px-4 py-4 marquee" style={{ "--marquee-duration": "32s" } as React.CSSProperties}>
        {loop.map((g, i) => (
          <li key={g.key + i} aria-hidden={i >= ITEMS.length ? true : undefined} className="polaroid shrink-0 bg-white p-2.5 pb-3 sm:p-3 sm:pb-4 shadow-[0_10px_30px_rgba(27,31,58,0.15)] rounded-sm" style={{ transform: `rotate(${tilts[i % tilts.length]})`, fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif" }}>
            <div className="h-48 w-60 sm:h-64 sm:w-80 overflow-hidden rounded-[2px] relative">
              <div className="absolute left-0 top-0 h-[256px] w-[320px] origin-top-left max-sm:scale-75">{g.mock}</div>
            </div>
            <p className="mt-3 text-sm font-semibold" style={{ color: "var(--ink)" }}>{g.caption}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
