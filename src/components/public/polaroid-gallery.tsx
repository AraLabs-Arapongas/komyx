"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export type GalleryItem = { url: string; caption?: string | null };

const tilts = ["-3deg", "2deg", "-1.5deg", "2.5deg", "-2deg", "1.5deg", "-2.5deg", "2deg"];

/**
 * Polaroid strip that drifts sideways on its own (marquee). The list is doubled so the loop is
 * seamless; it pauses on hover/focus and stays static when the visitor prefers reduced motion.
 * Tapping a photo opens it full screen (arrows, swipe, Esc).
 */
export function PolaroidGallery({ items }: { items: GalleryItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!items.length) return null;
  const loop = items.length >= 3 ? [...items, ...items] : items;
  const animate = items.length >= 3;
  return (
    <>
      <div className="-mx-4 overflow-hidden" aria-roledescription="carrossel" aria-label="Fotos do buffet">
        <ul className={`flex gap-6 w-max px-4 py-4 ${animate ? "marquee" : ""}`} style={{ "--marquee-duration": `${Math.max(items.length * 7, 24)}s` } as React.CSSProperties}>
          {loop.map((g, i) => {
            const copy = i >= items.length;
            return (
              <li key={g.url + i} aria-hidden={copy ? true : undefined} className="polaroid shrink-0 bg-white p-2.5 pb-3 sm:p-3 sm:pb-4 shadow-[0_10px_30px_rgba(27,31,58,0.15)] rounded-sm" style={{ transform: `rotate(${tilts[i % tilts.length]})` }}>
                <button type="button" tabIndex={copy ? -1 : undefined} onClick={() => setOpen(i % items.length)} className="block cursor-zoom-in text-left" aria-label={`Ampliar foto${g.caption ? `: ${g.caption}` : ""}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.url} alt={copy ? "" : g.caption ?? "Foto do buffet"} className="h-44 w-60 sm:h-64 sm:w-80 object-cover rounded-[2px]" loading="lazy" draggable={false} />
                  {g.caption ? <p className="mt-3 text-sm font-semibold" style={{ color: "var(--ink)" }}>{g.caption}</p> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      {open !== null ? <Lightbox items={items} index={open} onIndex={setOpen} onClose={() => setOpen(null)} /> : null}
    </>
  );
}

function Lightbox({ items, index, onIndex, onClose }: { items: GalleryItem[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchX = useRef<number | null>(null);
  const many = items.length > 1;
  const go = useCallback((d: number) => onIndex((index + d + items.length) % items.length), [index, items.length, onIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prevOverflow; };
  }, [go, onClose]);

  const item = items[index];
  return (
    <div role="dialog" aria-modal="true" aria-label={item.caption ?? "Foto do buffet"} className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 sm:p-8" style={{ background: "rgba(15,17,34,0.92)" }}
      onClick={onClose}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchX.current === null || !many) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
      }}>
      <button ref={closeRef} type="button" onClick={onClose} aria-label="Fechar" className="absolute right-3 top-3 sm:right-5 sm:top-5 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"><X className="h-6 w-6" /></button>
      <figure className="flex max-h-full max-w-5xl flex-col items-center" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={item.url} src={item.url} alt={item.caption ?? "Foto do buffet"} className="max-h-[78svh] w-auto max-w-full rounded-lg object-contain shadow-2xl" draggable={false} />
        <figcaption className="mt-3 flex items-center gap-3 text-sm text-white/90">
          {item.caption ? <span className="font-semibold">{item.caption}</span> : null}
          {many ? <span className="text-white/50">{index + 1} / {items.length}</span> : null}
        </figcaption>
      </figure>
      {many ? (
        <>
          <button type="button" onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Foto anterior" className="absolute left-2 sm:left-5 top-1/2 -translate-y-1/2 grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"><ChevronLeft className="h-7 w-7" /></button>
          <button type="button" onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Próxima foto" className="absolute right-2 sm:right-5 top-1/2 -translate-y-1/2 grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"><ChevronRight className="h-7 w-7" /></button>
        </>
      ) : null}
    </div>
  );
}
