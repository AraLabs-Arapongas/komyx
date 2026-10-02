import { useId, type CSSProperties } from "react";

/**
 * Komyx mark: a balloon with the K knocked out, knot and string. Fills with currentColor; the K
 * shows whatever is behind the mark. Source of truth also in public/brand/komyx-mark.svg.
 */
export function KomyxMark({ className = "", style, title = "Komyx" }: { className?: string; style?: CSSProperties; title?: string }) {
  const id = useId();
  const maskId = `komyx-k-${id.replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg viewBox="0 0 190 200" className={className} style={style} role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <mask id={maskId}>
          <rect width="190" height="200" fill="#fff" />
          <g fill="none" stroke="#000" strokeWidth="26" strokeLinecap="round" strokeLinejoin="round">
            <path d="M68 50 V128" />
            <path d="M80 94 L122 128" />
            <path d="M80 94 L118 54" />
          </g>
        </mask>
      </defs>
      <g fill="currentColor">
        <path mask={`url(#${maskId})`} d="M95 8 C 142 8 174 44 174 90 C 174 130 142 158 95 164 C 48 158 16 130 16 90 C 16 44 48 8 95 8 Z" />
        <path d="M86 164 L95 178 L104 164 Z" />
        <path fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" d="M95 178 C 97 186 88 190 94 198" />
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
