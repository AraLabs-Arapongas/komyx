"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Plus, FileText, UserPlus } from "lucide-react";
import { buttonClass } from "@/components/ui/button";

// One way in for parties: the wizard decides at the end whether the date is held, confirmed or
// left as a quote. Reserva/evento/orçamento used to be three entries into the same screen.
const ITEMS = [
  { href: "/eventos/novo", label: "Novo orçamento", icon: FileText },
  { href: "/clientes/novo", label: "Novo cliente", icon: UserPlus },
];

/** Primary "+ Novo" button with the two entry points. */
export function NewMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className={buttonClass("primary", "md", "w-full")} aria-haspopup="menu" aria-expanded={open}>
        <Plus className="h-4 w-4" /> Novo
      </button>
      {open ? (
        <ul role="menu" className="absolute left-0 right-0 mt-1 rounded-xl border border-border bg-surface shadow-lg z-40 overflow-hidden">
          {ITEMS.map(({ href, label, icon: Icon }) => (
            <li key={href} role="none">
              <Link role="menuitem" href={href} onClick={() => setOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-stone-50">
                <Icon className="h-4 w-4 text-brand" />
                <span className="font-medium">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
