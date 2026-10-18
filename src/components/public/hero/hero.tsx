import { preload } from "react-dom";
import { Users, Cake, Tag } from "lucide-react";
import { Bunting } from "@/components/public/bunting";
import { DemoBanner } from "@/components/public/demo-banner";
import { PartyScene } from "@/components/marketing/party-scene";
import { formatCurrency } from "@/lib/utils";
import type { HeroStyle } from "@/lib/hero";
import { HeroCopy, type HeroOrg, type HeroStat } from "./hero-copy";
import { BlobPhoto, ConfettiRain, ConfettiSprinkle, DoodleCloud, DoodleSparkle, DoodleStar, DoodleStrokes, DoodleSun, SoftBlobs, Balloon } from "./art";

type Photo = { url: string; caption: string | null };

type Props = {
  style: HeroStyle;
  org: HeroOrg & { cover_url: string | null; cover_caption: string | null; capacity: number | null; founded_year: number | null; is_demo: boolean; show_prices_public: boolean };
  gallery: { url: string; caption?: string | null }[];
  packages: { base_price: number | string }[];
  waUrl: string | null;
  q: string;
};

/**
 * The invitation at the top of the public page. The style is the buffet's choice; the photos are
 * always its own (cover first, then gallery). Without photos every style falls back to illustrated art.
 */
export function BuffetHero({ style, org, gallery, packages, waUrl, q }: Props) {
  const photos: Photo[] = [
    ...(org.cover_url ? [{ url: org.cover_url, caption: org.cover_caption }] : []),
    ...gallery.filter((g) => g.url !== org.cover_url).map((g) => ({ url: g.url, caption: g.caption ?? null })),
  ];
  if (photos[0]) preload(photos[0].url, { as: "image", fetchPriority: "high" });

  const years = org.founded_year ? new Date().getFullYear() - org.founded_year : 0;
  const stats: HeroStat[] = [];
  if (org.capacity) stats.push({ icon: Users, value: org.capacity, label: "pessoas" });
  if (years > 0) stats.push({ icon: Cake, value: years, label: "anos de festas" });
  if (packages.length) stats.push({ icon: Tag, value: packages.length, label: org.show_prices_public ? `pacotes a partir de ${formatCurrency(Math.min(...packages.map((p) => Number(p.base_price))))}` : "pacotes" });

  const copy = <HeroCopy org={org} waUrl={waUrl} q={q} stats={stats} variant={style === "cinema" ? "cinema" : "band"} />;
  const alt = photos[0]?.caption ?? org.name;

  if (style === "cinema") return <CinemaHero photos={photos.slice(0, 6)} alt={alt} isDemo={org.is_demo}>{copy}</CinemaHero>;

  return (
    <>
      {org.is_demo ? <DemoBanner /> : null}
      <section className="relative overflow-hidden" style={{ background: "var(--ink)", color: "var(--paper)" }}>
        <SoftBlobs />
        <div className="absolute inset-x-0 top-0"><Bunting /></div>
        <div className="relative mx-auto max-w-6xl px-4 pt-24 sm:pt-32 pb-14 sm:pb-20 grid gap-8 md:grid-cols-[1.05fr_0.95fr] md:items-center">
          {copy}
          {/* Photo first on phones (above the invitation), beside it from md up. */}
          <div className="max-md:order-first max-md:mx-auto max-md:w-full max-md:max-w-[19rem]">
            {style === "bolha" ? <BolhaArt photo={photos[0] ?? null} alt={alt} /> : style === "colagem" ? <ColagemArt photos={photos} alt={alt} /> : <ConfeteArt photo={photos[0] ?? null} alt={alt} />}
          </div>
        </div>
      </section>
    </>
  );
}

/* ---------- Cinema: the buffet's photos as a slow film behind the invitation ---------- */

function CinemaHero({ photos, alt, isDemo, children }: { photos: Photo[]; alt: string; isDemo: boolean; children: React.ReactNode }) {
  const n = photos.length;
  return (
    <div className="flex flex-col min-h-[100svh]">
      {isDemo ? <DemoBanner /> : null}
      <section className="relative flex-1 flex flex-col overflow-hidden" style={{ background: "var(--ink)", color: "var(--paper)" }}>
        {/* Slides: the first is the LCP image and stays underneath; the others crossfade on top (see .cinema-slide). */}
        <div className="absolute inset-0" aria-hidden="true">
          {n === 0 ? <SoftBlobs /> : null}
          {photos.map((p, i) => (
            <div key={p.url} className={`absolute inset-0 ${i > 0 ? "cinema-slide" : ""}`} style={i > 0 ? ({ "--cycle": `${n * 7}s`, "--delay": `${i * 7 - 1.5}s`, animationName: `cinema-fade-${n}` } as React.CSSProperties) : undefined}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={i === 0 ? alt : ""} className="cinema-img absolute inset-0 h-full w-full object-cover" style={{ "--i": i } as React.CSSProperties} fetchPriority={i === 0 ? "high" : undefined} loading={i === 0 ? "eager" : "lazy"} decoding="async" />
            </div>
          ))}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(27,31,58,0.96) 0%, rgba(27,31,58,0.72) 40%, rgba(27,31,58,0.3) 75%, rgba(27,31,58,0.45) 100%)" }} />
          <div className="absolute inset-0 max-md:hidden" style={{ background: "linear-gradient(to right, rgba(27,31,58,0.75) 0%, rgba(27,31,58,0.35) 50%, transparent 80%)" }} />
          <div className={n ? "opacity-70" : ""}><PartyScene /></div>
        </div>
        <div className="absolute inset-x-0 top-0"><Bunting /></div>
        <div className={`relative flex-1 flex flex-col mx-auto w-full max-w-6xl px-4 pt-28 pb-10 sm:pb-16 ${n ? "justify-end" : "justify-center"}`}>
          {children}
        </div>
      </section>
    </div>
  );
}

/* ---------- Bolha: the cover in an organic bubble, yellow doodle strokes around it ---------- */

function BolhaArt({ photo, alt }: { photo: Photo | null; alt: string }) {
  return (
    <div className="relative mx-auto w-full max-w-[26rem] md:max-w-none hero-art" aria-hidden={!photo || undefined}>
      <div className="absolute -inset-6 rounded-full" style={{ background: "radial-gradient(circle at 60% 40%, rgba(255,196,61,0.25), transparent 65%)" }} />
      <div className="absolute -left-6 top-8 h-32 w-32 rounded-full float-slow" style={{ background: "var(--berry)", opacity: 0.85 }} />
      <div className="absolute right-2 -bottom-4 h-20 w-20 rounded-full float-slow" style={{ background: "var(--sky)", opacity: 0.9 }} />
      <BlobPhoto id="a" src={photo?.url ?? null} alt={alt} priority className="relative aspect-[5/6] sm:aspect-square w-full" />
      <DoodleStrokes className="absolute -top-6 -right-2 w-28 sm:w-36" />
      <DoodleSparkle className="absolute left-4 -bottom-2 w-10 float-slow" />
      <DoodleSparkle className="absolute -right-3 bottom-24 w-7" color="#fff" />
      {photo?.caption ? <p className="absolute left-6 bottom-6 rounded-full px-3.5 py-1.5 text-sm font-bold shadow-lg" style={{ background: "var(--paper)", color: "var(--ink)", transform: "rotate(-3deg)" }}>{photo.caption}</p> : null}
    </div>
  );
}

/* ---------- Colagem: two photos in overlapping shapes with a smiling sun, star and cloud ---------- */

function ColagemArt({ photos, alt }: { photos: Photo[]; alt: string }) {
  const [first, second] = photos;
  return (
    <div className="relative mx-auto w-full max-w-[26rem] md:max-w-none aspect-[5/6] sm:aspect-square hero-art">
      <div className="absolute left-[-4%] top-[10%] h-28 w-28 rounded-full" style={{ background: "var(--mint)", opacity: 0.85 }} />
      <BlobPhoto id="b" src={first?.url ?? null} alt={alt} priority className="absolute left-0 top-0 w-[66%] aspect-[4/5]" />
      <div className="absolute right-[-2%] top-[34%] w-[64%] aspect-square rounded-full" style={{ background: "var(--berry)", opacity: 0.9 }} />
      <BlobPhoto id="c" src={second?.url ?? first?.url ?? null} alt={second?.caption ?? ""} className="absolute right-0 top-[36%] w-[60%] aspect-square" />
      <DoodleSun className="absolute -top-4 right-[6%] w-24 sm:w-28 float-slow" />
      <DoodleStar className="absolute left-[4%] bottom-[18%] w-14 sm:w-16 float-slow" />
      <DoodleCloud className="absolute left-[18%] bottom-[2%] w-28 sm:w-32" />
      <DoodleSparkle className="absolute right-[2%] top-[42%] w-8" color="#fff" />
      {first?.caption ? <p className="absolute left-3 top-0 rounded-full px-3.5 py-1.5 text-sm font-bold shadow-lg" style={{ background: "var(--sun)", color: "var(--ink)", transform: "rotate(-4deg)" }}>{first.caption}</p> : null}
    </div>
  );
}

/* ---------- Confete: the cover sits on a big yellow circle while confetti falls ---------- */

function ConfeteArt({ photo, alt }: { photo: Photo | null; alt: string }) {
  return (
    <div className="relative mx-auto w-full max-w-[26rem] md:max-w-none aspect-square hero-art">
      <ConfettiRain count={26} className="-inset-y-10 inset-x-0" />
      <div className="absolute inset-[5%] rounded-full" style={{ background: "var(--sun)" }} />
      <div className="absolute inset-[13%] rounded-full overflow-hidden ring-[10px] ring-[var(--ink)]/80 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.url} alt={alt} className="h-full w-full object-cover" fetchPriority="high" decoding="async" />
        ) : (
          <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, #e8356d, #ff8a3d 55%, #4cb5f5)" }} aria-hidden="true">
            <ConfettiSprinkle count={10} />
            <Balloon color="#fff" className="absolute left-[20%] bottom-[10%] w-[28%]" />
            <Balloon color="#2ec4a6" className="absolute left-[52%] bottom-[16%] w-[30%]" />
          </div>
        )}
      </div>
      <DoodleStar className="absolute right-[2%] top-[4%] w-14 float-slow" color="var(--berry)" />
      <DoodleSparkle className="absolute left-[2%] top-[22%] w-10" color="#fff" />
      <DoodleSparkle className="absolute left-[10%] bottom-[8%] w-8" color="var(--sky)" />
      {photo?.caption ? <p className="absolute right-6 bottom-8 rounded-full px-3.5 py-1.5 text-sm font-bold shadow-lg" style={{ background: "var(--paper)", color: "var(--ink)", transform: "rotate(3deg)" }}>{photo.caption}</p> : null}
    </div>
  );
}
