"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, Inbox, CalendarCheck, FileSignature} from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";

type Item = { id: string; type: string; title: string; body: string | null; href: string | null; read_at: string | null; created_at: string };

const ICONS: Record<string, typeof Bell> = { request: Inbox, reservation: CalendarCheck, contract_accepted: FileSignature };

/** Bell with unread badge. Polls /api/notifications; opening marks everything read. */
export function NotificationsBell({ initialUnread }: { initialUnread: number }) {
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const r = await fetch("/api/notifications", { cache: "no-store" });
      if (!r.ok) return;
      const d = await r.json();
      setItems(d.items ?? []);
      setUnread(d.unread ?? 0);
    } catch {}
  }

  useEffect(() => {
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      await load();
      if (unread > 0) {
        await fetch("/api/notifications", { method: "POST" }).catch(() => null);
        setUnread(0);
      }
    }
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={toggle} className="relative h-10 w-10 grid place-items-center rounded-lg text-muted hover:text-foreground hover:bg-stone-100" aria-label={unread ? `${unread} notificações não lidas` : "Notificações"} aria-expanded={open}>
        <Bell className="h-5 w-5" />
        {unread > 0 ? <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-brand text-brand-fg text-[11px] font-bold grid place-items-center">{unread > 99 ? "99+" : unread}</span> : null}
      </button>
      {open ? (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-2xl border border-border bg-surface shadow-xl z-40 overflow-hidden">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between"><p className="text-sm font-semibold">Notificações</p><Link href="/notificacoes" className="text-xs text-brand font-medium" onClick={() => setOpen(false)}>Ver todas</Link></div>
          {items.length === 0 ? <p className="px-3 py-6 text-sm text-muted text-center">Nada por aqui ainda.</p> : (
            <ul className="divide-y divide-border max-h-96 overflow-y-auto">
              {items.map((n) => {
                const Icon = ICONS[n.type] ?? Bell;
                return (
                  <li key={n.id}>
                    <Link href={n.href ?? "/notificacoes"} onClick={() => setOpen(false)} className={cn("flex gap-3 px-3 py-2.5 hover:bg-stone-50", !n.read_at && "bg-brand-soft/40")}>
                      <Icon className="h-4 w-4 mt-0.5 text-brand shrink-0" />
                      <span className="min-w-0"><span className="block text-sm font-medium truncate">{n.title}</span>{n.body ? <span className="block text-xs text-muted truncate">{n.body}</span> : null}<span className="block text-[11px] text-muted">{formatDateTime(n.created_at)}</span></span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
