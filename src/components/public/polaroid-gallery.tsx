"use client";

import { useState } from "react";
import { PhotoLightbox } from "./photo-lightbox";

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
      {open !== null ? <PhotoLightbox items={items} index={open} onIndex={setOpen} onClose={() => setOpen(null)} /> : null}
    </>
  );
}
