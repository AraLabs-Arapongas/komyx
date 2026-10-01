"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn, formatTime, toDateKey } from "@/lib/utils";
import { EVENT_STATUS_LABEL, type EventStatus } from "@/lib/labels";
import { EmptyState } from "@/components/ui/page";
import { buttonClass } from "@/components/ui/button";

export type AgendaEvent = {
  id: string;
  title: string | null;
  starts_at: string;
  ends_at: string;
  status: EventStatus;
  expires_at: string | null;
  estimated_participants: number | null;
  space: string;
  customers: { name: string } | null;
};

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

const dotClass: Record<EventStatus, string> = {
  QUOTE: "bg-stone-300",
  PRE_RESERVED: "bg-amber-400",
  CONFIRMED: "bg-emerald-500",
  DONE: "bg-slate-400",
  CANCELLED: "bg-red-400",
  EXPIRED: "bg-stone-300",
};

const pillClass: Record<EventStatus, string> = {
  QUOTE: "bg-white text-stone-500 border-dashed border-stone-300",
  PRE_RESERVED: "bg-amber-100 text-amber-900 border-amber-200",
  CONFIRMED: "bg-emerald-100 text-emerald-900 border-emerald-200",
  DONE: "bg-slate-100 text-slate-700 border-slate-200",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
  EXPIRED: "bg-stone-100 text-stone-500 border-stone-200",
};

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function daysInMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function dayKey(month: string, day: number) {
  return `${month}-${String(day).padStart(2, "0")}`;
}

function weekdayOf(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function shiftDay(key: string, delta: number) {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return dt.toISOString().slice(0, 10);
}

function label(e: AgendaEvent) {
  return e.title?.trim() || (e.customers ? `Festa de ${e.customers.name}` : "Evento");
}

export function AgendaView({ events, month, today, initialView, isOwner }: { events: AgendaEvent[]; month: string; today: string; initialView: "list" | "month" | "week"; isOwner: boolean }) {
  const [view, setView] = useState<"list" | "month" | "week">(initialView);
  const [selected, setSelected] = useState<string>(today.startsWith(month) ? today : dayKey(month, 1));

  const byDay = useMemo(() => {
    const map = new Map<string, AgendaEvent[]>();
    for (const e of events) {
      const k = toDateKey(e.starts_at);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    return map;
  }, [events]);

  const [y, m] = month.split("-").map(Number);
  const title = MONTHS[m - 1];

  const monthEvents = useMemo(() => events.filter((e) => toDateKey(e.starts_at).startsWith(month)), [events, month]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Link href={`/agenda?m=${shiftMonth(month, -1)}&view=${view}`} className="h-10 w-10 grid place-items-center rounded-lg hover:bg-stone-100" aria-label="Mês anterior"><ChevronLeft className="h-5 w-5" /></Link>
          <span className="font-semibold min-w-36 text-center"><span className="capitalize">{title}</span> de {y}</span>
          <Link href={`/agenda?m=${shiftMonth(month, 1)}&view=${view}`} className="h-10 w-10 grid place-items-center rounded-lg hover:bg-stone-100" aria-label="Próximo mês"><ChevronRight className="h-5 w-5" /></Link>
        </div>
        <div className="flex rounded-xl border border-border bg-surface p-0.5 text-sm">
          {(["list", "week", "month"] as const).map((v) => (
            <button key={v} type="button" onClick={() => setView(v)} className={cn("px-3 py-1.5 rounded-lg font-medium", view === v ? "bg-brand text-brand-fg" : "text-muted")}>
              {v === "list" ? "Lista" : v === "week" ? "Semana" : "Mês"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted">
        {(["QUOTE", "PRE_RESERVED", "CONFIRMED", "DONE"] as EventStatus[]).map((s) => (
          <span key={s} className="inline-flex items-center gap-1"><span className={cn("h-2 w-2 rounded-full", dotClass[s])} /> {EVENT_STATUS_LABEL[s]}</span>
        ))}
      </div>

      {view === "list" ? (
        monthEvents.length === 0 ? (
          <EmptyState title="Nenhum evento neste mês" description="Toque em Criar para registrar um orçamento." action={<Link href={`/eventos/novo?date=${dayKey(month, 1)}`} className={buttonClass("primary", "sm")}><Plus className="h-4 w-4" /> Novo orçamento</Link>} />
        ) : (
          <div className="space-y-4">
            {Array.from(byDay.entries()).filter(([k]) => k.startsWith(month)).sort().map(([day, list]) => (
              <DayGroup key={day} day={day} list={list} today={today} isOwner={isOwner} />
            ))}
          </div>
        )
      ) : null}

      {view === "month" ? (
        <div className="space-y-3">
          <div className="grid grid-cols-7 text-center text-xs text-muted">{WEEKDAYS.map((d, i) => <div key={i} className="py-1">{d}</div>)}</div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: weekdayOf(dayKey(month, 1)) }).map((_, i) => <div key={`pad-${i}`} />)}
            {Array.from({ length: daysInMonth(month) }).map((_, i) => {
              const key = dayKey(month, i + 1);
              const list = byDay.get(key) ?? [];
              const isSel = key === selected;
              return (
                <button key={key} type="button" onClick={() => setSelected(key)}
                  className={cn("aspect-square rounded-xl border text-sm flex flex-col items-center justify-start pt-1.5 gap-1", isSel ? "border-brand bg-brand-soft" : "border-border bg-surface", key === today && "font-bold text-brand")}>
                  {i + 1}
                  <span className="flex gap-0.5">{list.slice(0, 3).map((e) => <span key={e.id} className={cn("h-1.5 w-1.5 rounded-full", dotClass[e.status])} />)}</span>
                </button>
              );
            })}
          </div>
          <DayGroup day={selected} list={byDay.get(selected) ?? []} today={today} showEmpty isOwner={isOwner} />
        </div>
      ) : null}

      {view === "week" ? (
        <WeekView selected={selected} setSelected={setSelected} byDay={byDay} today={today} isOwner={isOwner} />
      ) : null}
    </div>
  );
}

function WeekView({ selected, setSelected, byDay, today, isOwner }: { selected: string; setSelected: (k: string) => void; byDay: Map<string, AgendaEvent[]>; today: string; isOwner: boolean }) {
  const start = shiftDay(selected, -weekdayOf(selected));
  const days = Array.from({ length: 7 }, (_, i) => shiftDay(start, i));
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setSelected(shiftDay(selected, -7))} className="h-10 w-10 grid place-items-center rounded-lg hover:bg-stone-100" aria-label="Semana anterior"><ChevronLeft className="h-5 w-5" /></button>
        <span className="text-sm text-muted">{days[0].split("-").reverse().slice(0, 2).join("/")} – {days[6].split("-").reverse().slice(0, 2).join("/")}</span>
        <button type="button" onClick={() => setSelected(shiftDay(selected, 7))} className="h-10 w-10 grid place-items-center rounded-lg hover:bg-stone-100" aria-label="Próxima semana"><ChevronRight className="h-5 w-5" /></button>
      </div>
      <div className="space-y-2">
        {days.map((d) => (
          <DayGroup key={d} day={d} list={byDay.get(d) ?? []} today={today} showEmpty compact isOwner={isOwner} />
        ))}
      </div>
    </div>
  );
}

function DayGroup({ day, list, today, showEmpty = false, compact = false, isOwner }: { day: string; list: AgendaEvent[]; today: string; showEmpty?: boolean; compact?: boolean; isOwner: boolean }) {
  const [y, m, d] = day.split("-");
  const wd = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"][weekdayOf(day)];
  return (
    <section>
      <div className="flex items-center justify-between mb-1.5">
        <h3 className={cn("text-sm font-semibold", day === today && "text-brand")}>{wd}, {d}/{m}{compact ? "" : `/${y}`}{day === today ? " · hoje" : ""}</h3>
        {(() => {
          const blocking = list.some((e) => e.status === "CONFIRMED" || (e.status === "PRE_RESERVED" && e.expires_at && new Date(e.expires_at) > new Date()));
          if (!blocking) return <Link href={`/eventos/novo?date=${day}`} className="text-xs text-brand font-medium inline-flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> evento</Link>;
          if (!isOwner) return <span className="text-xs text-muted">dia ocupado</span>;
          return <Link href={`/eventos/novo?date=${day}&another=1`} className="text-xs text-amber-700 font-medium inline-flex items-center gap-1" title="Já existe evento neste dia"><Plus className="h-3.5 w-3.5" /> outro evento</Link>;
        })()}
      </div>
      {list.length === 0 ? (
        showEmpty ? <p className="text-sm text-muted rounded-xl border border-dashed border-border px-3 py-2">Livre</p> : null
      ) : (
        <ul className="space-y-1.5">
          {list.map((e) => (
            <li key={e.id}>
              <Link href={`/eventos/${e.id}`} className={cn("flex items-center gap-3 rounded-xl border px-3 py-2", pillClass[e.status])}>
                <span className="text-xs font-mono whitespace-nowrap">{formatTime(e.starts_at)}–{formatTime(e.ends_at)}</span>
                <span className="font-medium truncate flex-1">{label(e)}</span>
                {e.estimated_participants ? <span className="text-xs opacity-70">{e.estimated_participants} pes.</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
