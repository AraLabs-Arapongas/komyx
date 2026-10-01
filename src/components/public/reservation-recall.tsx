"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarCheck } from "lucide-react";

const KEY = "festeja:reservations";
type Item = { token: string; date: string; org: string };

/** Banner on the buffet page for visitors who already reserved from this device. */
export function ReservationRecall({ orgName }: { orgName: string }) {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const list: Item[] = raw ? JSON.parse(raw) : [];
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage after mount
      setItems(list.filter((r) => r.org === orgName));
    } catch {}
  }, [orgName]);
  if (!items.length) return null;
  return (
    <div className="mx-auto max-w-5xl px-4 pt-4">
      {items.map((r) => (
        <Link key={r.token} href={`/r/${r.token}`} className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold" style={{ background: "var(--sun)", color: "var(--ink)" }}>
          <CalendarCheck className="h-5 w-5" /> Sua reserva de {new Date(r.date).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}: ver Pix, orçamento e contrato
        </Link>
      ))}
    </div>
  );
}
