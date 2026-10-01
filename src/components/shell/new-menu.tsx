"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Plus, CalendarCheck, PartyPopper, FileText, UserPlus } from "lucide-react";
import { buttonClass } from "@/components/ui/button";

const ITEMS = [
  { href: "/eventos/novo?status=PRE_RESERVED", label: "Nova reserva", hint: "segura a data", icon: CalendarCheck },
  { href: "/eventos/novo?status=CONFIRMED", label: "Novo evento", hint: "já fechado", icon: PartyPopper },
  { href: "/eventos/novo?status=QUOTE", label: "Novo orçamento", hint: "sem bloquear a data", icon: FileText },
  { href: "/clientes/novo", label: "Novo cliente", hint: "cadastro", icon: UserPlus },
];

/** Primary "+ Novo" button with the four entry points. */
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
          {ITEMS.map(({ href, label, hint, icon: Icon }) => (
            <li key={href} role="none">
              <Link role="menuitem" href={href} onClick={() => setOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-stone-50">
                <Icon className="h-4 w-4 text-brand" />
                <span className="font-medium">{label}</span>
                <span className="ml-auto text-xs text-muted">{hint}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
