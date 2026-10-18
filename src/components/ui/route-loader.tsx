"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Komyx balloon colors: sun, berry, mint, sky, lilac.
const COLORS = ["#ffc43d", "#ec4899", "#34d399", "#38bdf8", "#a78bfa"];
const STEP_MS = 400;
// Fast navigations never flash the backdrop.
const DELAY_MS = 200;
const START_EVENT = "komyx:navstart";

/** Shows the route loader for a navigation started in code (router.push), not by a link click. */
export function startRouteLoading() {
  window.dispatchEvent(new Event(START_EVENT));
}

/**
 * Route-change loader: when an internal link is clicked (or startRouteLoading() is called) and the next
 * page takes more than DELAY_MS, the current page dims and Komyx balloons pop in one by one, then fly off
 * and start over, until the new URL lands. The backdrop also swallows extra clicks while waiting.
 * Mounted once in the root layout.
 */
export function RouteLoader() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [shown, setShown] = useState(false);
  const pending = useRef(false);
  const delay = useRef<number | undefined>(undefined);
  const safety = useRef<number | undefined>(undefined);

  // A new URL means the navigation landed.
  useEffect(() => {
    if (!pending.current) return;
    pending.current = false;
    window.clearTimeout(delay.current);
    window.clearTimeout(safety.current);
    setShown(false);
  }, [pathname, search]);

  useEffect(() => {
    const start = () => {
      pending.current = true;
      window.clearTimeout(delay.current);
      window.clearTimeout(safety.current);
      delay.current = window.setTimeout(() => { if (pending.current) setShown(true); }, DELAY_MS);
      // A navigation that never lands (offline, error) must not lock the screen.
      safety.current = window.setTimeout(() => { pending.current = false; setShown(false); }, 15000);
    };
    // Not checking e.defaultPrevented: next/link always prevents the native click (it navigates itself), so
    // that flag says nothing here. Blockers that cancel a navigation (the unsaved-changes guard) stop the
    // event in the capture phase, so it never reaches this bubbling listener.
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || !a.href || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Same page, or only the #hash changes: nothing to wait for.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    };
    document.addEventListener("click", onClick);
    window.addEventListener(START_EVENT, start);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener(START_EVENT, start);
      window.clearTimeout(delay.current);
      window.clearTimeout(safety.current);
    };
  }, []);

  if (!shown) return null;
  return (
    <div role="status" aria-label="Carregando" className="route-loader fixed inset-0 z-[9999] grid place-items-center" style={{ background: "rgba(27,31,58,0.55)" }}>
      <Balloons />
    </div>
  );
}

/** Five balloons that pop in one by one, fly away together, and start over. */
function Balloons() {
  const [count, setCount] = useState(0);
  const [flying, setFlying] = useState(false);
  useEffect(() => {
    let t: number;
    if (flying) t = window.setTimeout(() => { setFlying(false); setCount(0); }, 700);
    else if (count < COLORS.length) t = window.setTimeout(() => setCount((c) => c + 1), count === 0 ? 0 : STEP_MS);
    else t = window.setTimeout(() => setFlying(true), STEP_MS);
    return () => window.clearTimeout(t);
  }, [count, flying]);
  return (
    <div className="flex h-24 items-end gap-2.5" aria-hidden>
      <svg width="0" height="0" className="absolute">
        <defs>
          <mask id="route-loader-k" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200">
            <rect width="200" height="200" fill="#fff" />
            <g fill="none" stroke="#000" strokeWidth="26" strokeLinecap="round" strokeLinejoin="round">
              <path d="M68 50 V128" /><path d="M80 94 L122 128" /><path d="M80 94 L118 54" />
            </g>
          </mask>
        </defs>
      </svg>
      {COLORS.map((c, i) => (
        <svg key={c} viewBox="0 0 200 200" className={`route-loader-balloon ${i < count ? (flying ? "is-flying" : "is-on") : ""}`} style={{ color: c, fill: c, animationDelay: flying ? `${i * 60}ms` : undefined }}>
          <path mask="url(#route-loader-k)" d="M100 8 C 147 8 179 44 179 90 C 179 130 147 158 100 164 C 53 158 21 130 21 90 C 21 44 53 8 100 8 Z" />
          <path d="M91 164 L100 178 L109 164 Z" />
          <path fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" d="M100 178 C 102 186 93 190 99 198" />
        </svg>
      ))}
    </div>
  );
}
