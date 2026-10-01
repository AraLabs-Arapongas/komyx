"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { buttonClass } from "@/components/ui/button";

/**
 * Wraps a settings page. Tracks edits in any <form data-settings> inside it:
 * - shows a sticky "Salvar alterações" bar only while something is unsaved (submits that form);
 * - asks before leaving (in-app links or browser navigation) while there are unsaved edits.
 */
export function UnsavedGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [dirty, setDirty] = useState<HTMLFormElement | null>(null);
  const [leaveTo, setLeaveTo] = useState<string | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const onInput = (e: Event) => {
      const form = (e.target as HTMLElement).closest?.("form[data-settings]") as HTMLFormElement | null;
      if (form) setDirty(form);
    };
    const onSubmit = (e: Event) => { if ((e.target as HTMLElement).closest?.("form[data-settings]")) setDirty(null); };
    const onReset = onSubmit;
    root.addEventListener("input", onInput);
    root.addEventListener("change", onInput);
    root.addEventListener("submit", onSubmit);
    root.addEventListener("reset", onReset);
    return () => { root.removeEventListener("input", onInput); root.removeEventListener("change", onInput); root.removeEventListener("submit", onSubmit); root.removeEventListener("reset", onReset); };
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || e.metaKey || e.ctrlKey) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname + url.search === location.pathname + location.search) return;
      e.preventDefault(); e.stopPropagation();
      setLeaveTo(url.pathname + url.search + url.hash);
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => { window.removeEventListener("beforeunload", onBeforeUnload); document.removeEventListener("click", onClick, true); };
  }, [dirty]);

  return (
    <div ref={ref} className="contents">
      {children}
      {dirty ? (
        <div className="fixed inset-x-0 bottom-20 md:bottom-4 z-30 flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-border bg-surface shadow-lg px-4 py-2.5 text-sm">
            <span className="text-muted">Alterações não salvas</span>
            <button type="button" onClick={() => { dirty.reset(); setDirty(null); }} className={buttonClass("ghost", "sm")}>Descartar</button>
            <button type="button" onClick={() => dirty.requestSubmit()} className={buttonClass("primary", "sm")}>Salvar alterações</button>
          </div>
        </div>
      ) : null}
      {leaveTo ? (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-6" onClick={() => setLeaveTo(null)}>
          <div role="dialog" aria-label="Alterações não salvas" className="w-full max-w-sm rounded-2xl bg-surface border border-border p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <p className="font-semibold">Você tem alterações não salvas.</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setLeaveTo(null)} className={buttonClass("outline", "sm")}>Continuar editando</button>
              <button type="button" onClick={() => { dirty?.reset(); setDirty(null); const to = leaveTo; setLeaveTo(null); router.push(to); }} className={buttonClass("primary", "sm")}>Descartar alterações</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
