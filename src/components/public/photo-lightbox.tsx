"use client";

import { useCallback, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export type LightboxItem = { url: string; caption?: string | null; description?: string | null };

/**
 * Full-screen photo viewer for the public pages (gallery, party themes): arrows, swipe, Esc, tap
 * outside to close. `action` adds a button under the photo (e.g. "Escolher este tema").
 */
export function PhotoLightbox({ items, index, onIndex, onClose, action }: {
  items: LightboxItem[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  action?: (i: number) => { label: string; onClick: () => void } | null;
}) {
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
  const act = action?.(index) ?? null;
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
        <img key={item.url} src={item.url} alt={item.caption ?? "Foto do buffet"} className={`${item.description || act ? "max-h-[66svh]" : "max-h-[78svh]"} w-auto max-w-full rounded-lg object-contain shadow-2xl`} draggable={false} />
        <figcaption className="mt-3 max-w-xl text-center text-white/90">
          <p className="flex items-center justify-center gap-3 text-sm">
            {item.caption ? <span className="font-semibold text-base text-white">{item.caption}</span> : null}
            {many ? <span className="text-white/50">{index + 1} / {items.length}</span> : null}
          </p>
          {item.description ? <p className="mt-1 text-sm/relaxed text-white/75">{item.description}</p> : null}
        </figcaption>
        {act ? <button type="button" onClick={act.onClick} className="mt-4 inline-flex h-12 items-center rounded-full px-6 font-extrabold text-white" style={{ background: "var(--berry)" }}>{act.label}</button> : null}
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
