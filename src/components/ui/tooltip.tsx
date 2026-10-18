"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Small dark tooltip shown on hover or keyboard focus. Portaled with fixed positioning, so tables or
 * cards that clip their overflow don't cut it. Prefer it over title="", which shows late and plain.
 */
export function Tooltip({ content, children, className }: { content: React.ReactNode; children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const show = () => {
    const r = ref.current?.getBoundingClientRect();
    if (r) setPos({ x: r.left + r.width / 2, y: r.top });
  };
  const hide = () => setPos(null);
  return (
    <span ref={ref} className={className} tabIndex={0} onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {children}
      {pos ? createPortal(
        <span role="tooltip" className="pointer-events-none fixed z-[70] -translate-x-1/2 -translate-y-full rounded-lg bg-stone-900 px-2.5 py-1.5 text-xs leading-snug text-white shadow-lg whitespace-nowrap"
          style={{ left: pos.x, top: pos.y - 8 }}>
          {content}
          <span aria-hidden className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-stone-900" />
        </span>,
        document.body,
      ) : null}
    </span>
  );
}
