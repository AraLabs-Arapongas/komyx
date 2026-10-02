"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Fades/slides children in when they enter the viewport. Children with [data-stagger] animate in sequence.
 * The "in" flag lives in React state (not an imperative classList change) so re-renders — including
 * Fast Refresh — never wipe it and leave a section invisible.
 */
export function Reveal({ children, className = "", as: Tag = "div", ...rest }: { children: ReactNode; className?: string; as?: "div" | "section" | "ul" | "li"; "aria-label"?: string; id?: string }) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    // Reduced motion is handled in CSS (.reveal is fully visible there), so no sync setState here.
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting || e.boundingClientRect.top < 0) { setShown(true); io.disconnect(); }
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);
  const Comp = Tag as "div";
  return <Comp ref={ref as React.RefObject<HTMLDivElement>} className={`reveal ${shown ? "in" : ""} ${className}`} {...rest}>{children}</Comp>;
}
