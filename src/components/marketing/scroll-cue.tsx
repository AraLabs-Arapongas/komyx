"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

/** Semi-transparent mouse at the bottom of the viewport until the visitor scrolls. */
export function ScrollCue({ href }: { href: string }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const onScroll = () => setHidden(window.scrollY > 120);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <a href={href} aria-label="Rolar para ver mais" onClick={(e) => { const el = document.querySelector(href); if (el) { e.preventDefault(); el.scrollIntoView({ behavior: "smooth", block: "start" }); } }} className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1 text-white/60 hover:text-white/90 transition-opacity duration-500 ${hidden ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
      <span className="h-9 w-6 rounded-full border-2 border-current flex justify-center pt-1.5"><span className="scroll-cue-dot h-1.5 w-1.5 rounded-full bg-current" /></span>
      <ChevronDown className="h-4 w-4" />
    </a>
  );
}
