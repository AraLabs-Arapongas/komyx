export type GalleryItem = { url: string; caption?: string | null };

const tilts = ["-3deg", "2deg", "-1.5deg", "2.5deg", "-2deg", "1.5deg", "-2.5deg", "2deg"];

export function PolaroidGallery({ items }: { items: GalleryItem[] }) {
  if (!items.length) return null;
  return (
    <div className="-mx-4 px-4 overflow-x-auto pb-4 [scrollbar-width:none]">
      <ul className="flex gap-5 w-max py-3">
        {items.map((g, i) => (
          <li key={g.url + i} className="polaroid shrink-0 bg-white p-3 pb-4 shadow-[0_10px_30px_rgba(27,31,58,0.15)] rounded-sm" style={{ transform: `rotate(${tilts[i % tilts.length]})` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={g.url} alt={g.caption ?? "Foto do buffet"} className="h-52 w-72 sm:h-64 sm:w-80 object-cover rounded-[2px]" loading="lazy" />
            {g.caption ? <p className="mt-3 text-sm font-semibold" style={{ color: "var(--ink)" }}>{g.caption}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
