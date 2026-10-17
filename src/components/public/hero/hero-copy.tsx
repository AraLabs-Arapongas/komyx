import Link from "next/link";
import { Calculator, MessageCircle, type LucideIcon } from "lucide-react";
import { titleSegments } from "@/lib/hero";

export type HeroStat = { icon: LucideIcon; value: string | number; label: string };

export type HeroOrg = { name: string; slug: string; logo_url: string | null; tagline: string | null; description: string | null };

type Props = {
  org: HeroOrg;
  waUrl: string | null;
  q: string;
  stats: HeroStat[];
  /** Cinema sits on a photo: tighter copy and a slightly larger title. */
  variant?: "band" | "cinema";
};

/** Text column shared by every hero style: logo + name, colored title, description, CTAs, caption, stats. */
export function HeroCopy({ org, waUrl, q, stats, variant = "band" }: Props) {
  const title = org.tagline ?? `Festa infantil sem dor de cabeça no ${org.name}`;
  const cinema = variant === "cinema";
  return (
    <div className={cinema ? "max-w-3xl" : ""}>
      <div className="flex items-center gap-3 mb-5">
        {org.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={org.logo_url} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-[var(--sun)]" />
        ) : <span className="h-12 w-12 rounded-full grid place-items-center font-bold display text-xl" style={{ background: "var(--sun)", color: "var(--ink)" }}>{org.name[0]}</span>}
        <span className="font-extrabold text-base" style={{ color: "var(--sun)" }}>{org.name}</span>
      </div>
      <h1 className={`display font-extrabold leading-[0.98] text-balance ${cinema ? "text-[2.75rem] sm:text-6xl lg:text-7xl" : "text-[2.6rem] sm:text-5xl lg:text-6xl"}`}>
        {titleSegments(title).map((s, i) => <span key={i} style={s.tone === "sun" ? { color: "var(--sun)" } : undefined}>{s.text}</span>)}
      </h1>
      {org.description ? <p className={`mt-5 text-lg/relaxed max-w-prose ${cinema ? "max-sm:line-clamp-3 max-w-xl" : ""}`} style={{ color: "#dcdff0" }}>{org.description}</p> : null}
      <div className="mt-7 flex flex-col sm:flex-row gap-3">
        <Link href={`/p/${org.slug}/orcamento${q}`} className="inline-flex items-center justify-center gap-2 h-14 px-6 rounded-full font-extrabold text-base shadow-[0_12px_30px_rgba(232,53,109,0.35)] transition-transform active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sun)]" style={{ background: "var(--berry)", color: "#fff" }}>
          <Calculator className="h-5 w-5" /> Monte seu orçamento
        </Link>
        {waUrl ? (
          <a href={waUrl} target="_blank" rel="noopener" className="inline-flex items-center justify-center gap-2 h-14 px-6 rounded-full font-bold text-base ring-2 ring-inset ring-white/35 bg-white/5 hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sun)]">
            <MessageCircle className="h-5 w-5" /> Falar no WhatsApp
          </a>
        ) : null}
      </div>
      <p className="mt-3 text-sm" style={{ color: "#aeb2cc" }}>Leva 2 minutos. Você escolhe pacote, data e quantidade de pessoas e já vê o valor.</p>
      {stats.length ? (
        <ul className="mt-6 sm:mt-7 flex flex-wrap gap-x-5 sm:gap-x-7 gap-y-3 text-xs sm:text-sm" style={{ color: "#dcdff0" }}>
          {stats.map(({ icon: Icon, value, label }) => (
            <li key={label} className="flex items-center gap-2.5">
              <span className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 grid place-items-center rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}><Icon className="h-4 w-4" style={{ color: "var(--sun)" }} /></span>
              <span className="leading-tight"><b className="display text-xl sm:text-2xl text-white">{value}</b> <span className="block">{label}</span></span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
