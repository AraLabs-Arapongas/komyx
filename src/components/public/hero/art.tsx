/**
 * Hand-drawn bits shared by the hero styles: organic photo masks, doodles, soft color blobs and the
 * illustrated fallback for buffets without photos. Pure SVG/CSS, deterministic (server and client agree).
 */

export const PALETTE = ["#e8356d", "#ffc43d", "#4cb5f5", "#2ec4a6", "#ff8a3d"];

/** Organic shapes in objectBoundingBox units (0..1) so the same path fits any box. */
const BLOBS = {
  a: "M0.5 0.02 C0.72 -0.02 0.9 0.1 0.96 0.3 C1.02 0.5 0.98 0.74 0.84 0.9 C0.7 1.04 0.44 1.02 0.24 0.94 C0.06 0.86 -0.02 0.68 0.02 0.48 C0.06 0.3 0.12 0.2 0.22 0.12 C0.32 0.04 0.4 0.04 0.5 0.02 Z",
  b: "M0.42 0.02 C0.66 -0.02 0.92 0.06 0.97 0.26 C1.02 0.46 0.96 0.72 0.86 0.9 C0.76 1.04 0.46 1.02 0.26 0.96 C0.08 0.9 0 0.74 0.02 0.54 C0.04 0.34 0.06 0.16 0.18 0.08 C0.26 0.03 0.32 0.03 0.42 0.02 Z",
  c: "M0.48 0.02 C0.74 -0.02 0.98 0.16 1 0.44 C1.02 0.7 0.86 0.94 0.6 0.99 C0.34 1.04 0.1 0.92 0.03 0.7 C-0.04 0.48 0.08 0.26 0.22 0.12 C0.3 0.05 0.38 0.03 0.48 0.02 Z",
} as const;

export type BlobId = keyof typeof BLOBS;

/** Photo (or the fallback art) clipped to a blob; the caller positions it. The clipPath lives inline so each hero is self-contained. */
export function BlobPhoto({ id, src, alt, className = "", priority = false, children }: { id: BlobId; src: string | null; alt: string; className?: string; priority?: boolean; children?: React.ReactNode }) {
  const clipId = `hero-blob-${id}`;
  return (
    <div className={className} style={{ clipPath: `url(#${clipId})` }}>
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs><clipPath id={clipId} clipPathUnits="objectBoundingBox"><path d={BLOBS[id]} /></clipPath></defs>
      </svg>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-cover" fetchPriority={priority ? "high" : undefined} loading={priority ? "eager" : "lazy"} decoding="async" />
      ) : <FallbackArt />}
      {children}
    </div>
  );
}

/** Soft colored blobs behind the band heroes: the "walked into a party" glow on the navy. */
export function SoftBlobs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full" style={{ background: "radial-gradient(circle, rgba(232,53,109,0.45), transparent 70%)" }} />
      <div className="absolute top-1/3 right-[-8rem] h-[28rem] w-[28rem] rounded-full" style={{ background: "radial-gradient(circle, rgba(76,181,245,0.35), transparent 70%)" }} />
      <div className="absolute -bottom-32 left-1/3 h-80 w-80 rounded-full" style={{ background: "radial-gradient(circle, rgba(46,196,166,0.3), transparent 70%)" }} />
      <div className="absolute bottom-10 right-1/4 h-40 w-40 rounded-full" style={{ background: "radial-gradient(circle, rgba(255,196,61,0.35), transparent 70%)" }} />
    </div>
  );
}

/** Confetti sprinkled on a static spot (no animation): dots and dashes in the party palette. */
export function ConfettiSprinkle({ count = 14, className = "" }: { count?: number; className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const ribbon = i % 3 === 2;
        const size = 6 + ((i * 5) % 7);
        return <span key={i} className="absolute" style={{ left: `${(i * 41 + 7) % 100}%`, top: `${(i * 29 + 13) % 100}%`, width: ribbon ? size * 0.45 : size, height: ribbon ? size * 2 : size, background: PALETTE[i % PALETTE.length], borderRadius: i % 3 === 1 ? "999px" : "2px", transform: `rotate(${(i * 47) % 360}deg)`, opacity: 0.9 }} />;
      })}
    </div>
  );
}

/** Falling confetti contained in its parent (parent must be overflow-hidden). Reuses .confetti-piece. */
export function ConfettiRain({ count = 22, className = "" }: { count?: number; className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const ribbon = i % 3 === 2;
        const size = 7 + ((i * 7) % 8);
        return <span key={i} className={`confetti-piece absolute top-0 ${i % 2 ? "max-sm:hidden" : ""}`} style={{ left: `${(i * 37 + 11) % 100}%`, width: ribbon ? size * 0.45 : size, height: ribbon ? size * 2.2 : size, background: PALETTE[i % PALETTE.length], borderRadius: i % 3 === 1 ? "999px" : "2px", animationDelay: `${-((i * 1.9) % 12)}s`, animationDuration: `${11 + ((i * 3) % 7)}s`, transform: `rotate(${(i * 53) % 360}deg)`, opacity: 0.9 }} />;
      })}
    </div>
  );
}

export function Balloon({ color, className = "", style }: { color: string; className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 60 140" className={className} style={style} aria-hidden="true">
      <path d="M30 86 C 29 100, 34 108, 28 124 C 24 132, 32 136, 30 140" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />
      <ellipse cx="30" cy="40" rx="26" ry="34" fill={color} />
      <ellipse cx="20" cy="26" rx="7" ry="11" fill="rgba(255,255,255,0.35)" transform="rotate(-20 20 26)" />
      <path d="M26 74 L30 82 L34 74 Z" fill={color} />
    </svg>
  );
}

/** What fills a photo slot when the buffet has no photos yet: a gradient sky, three balloons, confetti. */
export function FallbackArt() {
  return (
    <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, #e8356d 0%, #ff8a3d 45%, #ffc43d 100%)" }} aria-hidden="true">
      <ConfettiSprinkle count={12} />
      <Balloon color="#4cb5f5" className="absolute left-[14%] bottom-[8%] w-[26%] float-slow" />
      <Balloon color="#2ec4a6" className="absolute left-[40%] bottom-[18%] w-[32%] float-slow" />
      <Balloon color="#1b1f3a" className="absolute left-[66%] bottom-[6%] w-[22%] float-slow" />
    </div>
  );
}

/* ---------- Doodles (hand-drawn look: round caps, uneven curves) ---------- */

export function DoodleStrokes({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" stroke="var(--sun)" strokeWidth="5" strokeLinecap="round" aria-hidden="true">
      <path d="M10 70 C 14 40, 36 18, 68 14" />
      <path d="M22 92 C 30 70, 44 56, 64 50" strokeOpacity="0.6" />
      <path d="M86 20 l6 -10 M100 28 l10 -4 M94 12 l4 -2" stroke="#fff" strokeOpacity="0.7" strokeWidth="4" />
    </svg>
  );
}

export function DoodleSun({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <g stroke="var(--sun)" strokeWidth="6" strokeLinecap="round">
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI) / 4 + 0.2;
          const r1 = 40, r2 = 54 + (i % 2) * 6;
          return <line key={i} x1={60 + Math.cos(a) * r1} y1={60 + Math.sin(a) * r1} x2={60 + Math.cos(a) * r2} y2={60 + Math.sin(a) * r2} />;
        })}
      </g>
      <circle cx="60" cy="60" r="30" fill="var(--sun)" />
      <circle cx="49" cy="55" r="3.2" fill="var(--ink)" />
      <circle cx="71" cy="55" r="3.2" fill="var(--ink)" />
      <path d="M48 68 Q 60 80 72 68" fill="none" stroke="var(--ink)" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

export function DoodleStar({ className = "", color = "var(--berry)" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <path d="M50 6 L61 38 L95 40 L68 61 L78 94 L50 75 L22 94 L32 61 L5 40 L39 38 Z" fill={color} stroke="#fff" strokeWidth="4" strokeLinejoin="round" />
    </svg>
  );
}

export function DoodleCloud({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 90" className={className} aria-hidden="true">
      <path d="M40 78 H126 C148 78 152 46 128 44 C130 20 98 10 86 30 C76 8 36 16 40 44 C16 42 14 78 40 78 Z" fill="#fff" stroke="var(--sky)" strokeWidth="5" strokeLinejoin="round" />
    </svg>
  );
}

export function DoodleSparkle({ className = "", color = "var(--sun)" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 60 60" className={className} aria-hidden="true">
      <path d="M30 4 C 32 20, 40 28, 56 30 C 40 32, 32 40, 30 56 C 28 40, 20 32, 4 30 C 20 28, 28 20, 30 4 Z" fill={color} />
    </svg>
  );
}
