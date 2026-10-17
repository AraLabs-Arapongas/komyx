import type { HeroStyle } from "@/lib/hero";

/** Thumbnail sketch of each hero style for the settings picker: navy card, text lines, where the photo goes. */
export function HeroStylePreview({ style, className = "" }: { style: HeroStyle; className?: string }) {
  const lines = (
    <g fill="#fff">
      <rect x="12" y="30" width="34" height="7" rx="3.5" />
      <rect x="12" y="41" width="46" height="7" rx="3.5" fill="#ffc43d" />
      <rect x="12" y="54" width="40" height="3" rx="1.5" opacity="0.5" />
      <rect x="12" y="60" width="30" height="3" rx="1.5" opacity="0.5" />
      <rect x="12" y="70" width="26" height="8" rx="4" fill="#e8356d" />
    </g>
  );
  const bunting = (
    <g>
      {Array.from({ length: 8 }, (_, i) => <polygon key={i} points={`${8 + i * 16},6 ${20 + i * 16},6 ${14 + i * 16},14`} fill={["#e8356d", "#ffc43d", "#4cb5f5", "#2ec4a6"][i % 4]} />)}
    </g>
  );
  return (
    <svg viewBox="0 0 140 90" className={className} aria-hidden="true">
      <rect width="140" height="90" rx="8" fill="#1b1f3a" />
      {style === "cinema" ? (
        <>
          <rect x="0" y="0" width="140" height="90" rx="8" fill="url(#hero-prev-photo)" />
          <defs><linearGradient id="hero-prev-photo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4cb5f5" /><stop offset="0.5" stopColor="#ff8a3d" /><stop offset="1" stopColor="#e8356d" /></linearGradient></defs>
          <rect x="0" y="0" width="140" height="90" rx="8" fill="#1b1f3a" opacity="0.6" />
          {bunting}{lines}
        </>
      ) : style === "bolha" ? (
        <>
          {bunting}{lines}
          <path d="M100 22 c14 -3 26 6 28 20 c2 14 -6 26 -20 28 c-14 2 -26 -6 -28 -20 c-2 -14 6 -25 20 -28 z" fill="#ff8a3d" />
          <path d="M112 16 c4 -6 10 -8 14 -8" stroke="#ffc43d" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <circle cx="86" cy="58" r="6" fill="#e8356d" />
        </>
      ) : style === "colagem" ? (
        <>
          {bunting}{lines}
          <path d="M78 24 c12 -4 24 2 26 14 c2 12 -4 24 -16 26 c-12 2 -22 -6 -24 -18 c-2 -12 2 -20 14 -22 z" fill="#4cb5f5" />
          <path d="M104 46 c12 -2 22 6 22 18 c0 12 -10 20 -22 18 c-10 -2 -16 -10 -16 -18 c0 -10 6 -16 16 -18 z" fill="#ff8a3d" />
          <circle cx="126" cy="24" r="7" fill="#ffc43d" />
          <path d="M84 78 l3 -6 l3 6 z" fill="#e8356d" />
        </>
      ) : (
        <>
          {bunting}{lines}
          <circle cx="104" cy="50" r="26" fill="#ffc43d" />
          <circle cx="104" cy="50" r="19" fill="#ff8a3d" />
          <rect x="78" y="22" width="3" height="5" fill="#e8356d" transform="rotate(20 79 24)" />
          <rect x="130" y="34" width="3" height="5" fill="#4cb5f5" transform="rotate(-25 131 36)" />
          <circle cx="86" cy="76" r="2" fill="#2ec4a6" />
          <circle cx="128" cy="70" r="2" fill="#e8356d" />
        </>
      )}
    </svg>
  );
}
