import { Bell, Check, FileSignature, PartyPopper } from "lucide-react";

/**
 * Decorative stack of "it just happened" notifications floating to the right of the hero headline:
 * the story of a party selling itself. Pure CSS, desktop only (hidden below lg).
 */
const CARDS = [
  { icon: <Bell className="h-4 w-4" />, tone: "#ffc43d", title: "Nova solicitação", text: "Mariana Costa · Safári · 13/10 · 30 pessoas", when: "agora", rotate: "-2deg", top: 0, right: 0 },
  { icon: <Check className="h-4 w-4" />, tone: "#2ec4a6", title: "Pix recebido · R$ 750,00", text: "FESTABBBBBBBB00 · Festa do Theo confirmada", when: "há 2 min", rotate: "1.5deg", top: 80, right: 28 },
  { icon: <FileSignature className="h-4 w-4" />, tone: "#4cb5f5", title: "Contrato nº 12 aceito", text: "Roberto Lima leu e aceitou pelo link", when: "há 9 min", rotate: "-1deg", top: 160, right: 4 },
  { icon: <PartyPopper className="h-4 w-4" />, tone: "#e8356d", title: "Fam. Oliveira confirmou", text: "2 adultos · 1 criança · convite da Júlia", when: "há 20 min", rotate: "2deg", top: 240, right: 36 },
];

export function HeroStickers() {
  return (
    <div className="pointer-events-none absolute right-0 top-12 hidden lg:block w-[300px] h-[320px]" aria-hidden="true">
      {CARDS.map((c, i) => (
        <div key={c.title} className="hero-sticker absolute w-[268px] rounded-2xl bg-white px-3 py-2.5 flex items-start gap-2.5 shadow-[0_18px_40px_rgba(0,0,0,0.35)]" style={{ top: c.top, right: c.right, rotate: c.rotate, color: "#1b1f3a", ["--enter-delay" as string]: `${0.25 + i * 0.18}s` }}>
          <span className="mt-0.5 h-7 w-7 shrink-0 rounded-full grid place-items-center" style={{ background: c.tone, color: "#1b1f3a" }}>{c.icon}</span>
          <div className="min-w-0">
            <p className="text-[13px] font-extrabold leading-tight flex items-center justify-between gap-2">{c.title}<span className="text-[10px] font-semibold shrink-0" style={{ color: "#8a8ea8" }}>{c.when}</span></p>
            <p className="text-[11px] leading-snug mt-0.5" style={{ color: "#5b5f7a" }}>{c.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
