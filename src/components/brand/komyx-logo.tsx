import type { CSSProperties } from "react";

/**
 * Komyx mark: a K whose arms are an araponga (the bird in the AraLabs "A"): neck and head
 * on the upper arm, curved wing on the lower one. Fills with currentColor so it works on
 * ink, paper or the sun yellow. Source of truth also in public/brand/komyx-mark.svg.
 */
export function KomyxMark({ className = "", style, title = "Komyx" }: { className?: string; style?: CSSProperties; title?: string }) {
  return (
    <svg viewBox="0 0 184 170" className={className} style={style} role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
      <g fill="currentColor" fillRule="evenodd">
        <path d="M34 14 L72 14 L72 156 L28 156 Z" />
        <path d="M72 86 L122 40 C132 30 148 24 160 30 C170 35 178 44 184 52 L164 56 C158 68 146 76 132 72 L72 128 Z M150 40 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 Z" />
        <path d="M72 130 L102 104 C128 112 150 130 168 156 L124 156 C116 144 106 136 96 132 L72 152 Z" />
      </g>
    </svg>
  );
}

/** Mark + wordmark (+ optional tagline). Colors come from the parent (`color` for the mark, text classes for the words). */
export function KomyxLogo({ className = "", markClassName = "h-8 w-8", wordClassName = "text-base", tagline, taglineClassName = "" }: { className?: string; markClassName?: string; wordClassName?: string; tagline?: string; taglineClassName?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <KomyxMark className={markClassName} />
      <span className="leading-none">
        <span className={`block font-extrabold tracking-tight ${wordClassName}`}>Komyx</span>
        {tagline ? <span className={`block text-[11px] font-semibold mt-0.5 ${taglineClassName}`}>{tagline}</span> : null}
      </span>
    </span>
  );
}
