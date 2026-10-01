"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Package, Plus, Sparkles, X } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { PackageForm, AddonForm } from "./forms";

type Kind = "package" | "addon";

/** "+ Novo ▾" in the page header: choose package or addon, fill the form in a dialog. Always visible, lists can grow. */
export function NewItemMenu() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  const close = useCallback(() => setKind(null), []);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className={buttonClass("primary", "sm")} aria-haspopup="menu" aria-expanded={open}>
        <Plus className="h-4 w-4" /> Novo <ChevronDown className="h-4 w-4 -mr-1" />
      </button>
      {open ? (
        <ul role="menu" className="absolute right-0 mt-1 w-52 rounded-xl border border-border bg-surface shadow-lg z-40 overflow-hidden">
          <li role="none"><button role="menuitem" type="button" onClick={() => { setKind("package"); setOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-stone-50"><Package className="h-4 w-4 text-brand" /> <span className="font-medium">Novo pacote</span></button></li>
          <li role="none"><button role="menuitem" type="button" onClick={() => { setKind("addon"); setOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-stone-50"><Sparkles className="h-4 w-4 text-brand" /> <span className="font-medium">Novo adicional</span></button></li>
        </ul>
      ) : null}
      {kind ? createPortal(
        <div className="fixed inset-0 z-40 bg-black/30 flex items-end md:items-center justify-center p-0 md:p-6" onClick={close}>
          <div role="dialog" aria-label={kind === "package" ? "Novo pacote" : "Novo adicional"} className="w-full md:max-w-lg max-h-[90dvh] overflow-y-auto rounded-t-2xl md:rounded-2xl bg-surface border border-border p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-semibold">{kind === "package" ? "Novo pacote" : "Novo adicional"}</p>
              <button type="button" onClick={close} className="h-9 w-9 grid place-items-center rounded-lg hover:bg-stone-100" aria-label="Fechar"><X className="h-5 w-5" /></button>
            </div>
            {kind === "package" ? <PackageForm onSaved={close} /> : <AddonForm onSaved={close} />}
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
