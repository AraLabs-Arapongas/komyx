"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
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

type View = "list" | "month" | "week";
const VIEW_KEY = "komyx:agenda-view";

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
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

/** True when a date is taken by a confirmed event or an unexpired reservation. Quotes never block. */
function isBlocked(list: AgendaEvent[]) {
  return list.some((e) => e.status === "CONFIRMED" || (e.status === "PRE_RESERVED" && e.expires_at && new Date(e.expires_at) > new Date()));
}

/** The "+ Adicionar evento" action, same label on every day; busy days warn and are owner-only. */
function AddEvent({ day, list, isOwner, className }: { day: string; list: AgendaEvent[]; isOwner: boolean; className?: string }) {
  const blocked = isBlocked(list);
  if (blocked && !isOwner) return <span className={cn("text-xs text-muted", className)}>dia ocupado</span>;
  return (
    <Link href={`/eventos/novo?date=${day}${blocked ? "&another=1" : ""}`} title={blocked ? "Já existe evento neste dia" : undefined}
      className={cn("text-xs font-medium inline-flex items-center gap-1", blocked ? "text-amber-700" : "text-brand", className)}>
      <Plus className="h-3.5 w-3.5" /> Adicionar evento
    </Link>
  );
}

export function AgendaView({ events, month, today, initialView, isOwner }: { events: AgendaEvent[]; month: string; today: string; initialView: View | null; isOwner: boolean }) {
  // Default is Lista. A view in the URL wins; otherwise the last choice is remembered (desktop only — phones prefer Lista).
  const [view, setViewState] = useState<View>(initialView ?? "list");
  useEffect(() => {
    if (initialView) return;
    try {
      const stored = localStorage.getItem(VIEW_KEY) as View | null;
      const phone = window.matchMedia("(max-width: 767px)").matches;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore persisted preference after mount
      if (stored && !phone && (stored === "month" || stored === "week")) setViewState(stored);
    } catch {}
  }, [initialView]);
  function setView(v: View) {
    setViewState(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch {}
  }

  const [selected, setSelected] = useState<string>(today.startsWith(month) ? today : dayKey(month, 1));
  const [openDay, setOpenDay] = useState<string | null>(null);

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
    <div className={cn("space-y-3", view === "month" && "flex flex-col h-[calc(100dvh-11.75rem)] md:h-[calc(100dvh-6rem)]")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Link href={`/agenda?m=${shiftMonth(month, -1)}&view=${view}`} className="h-9 w-9 md:h-10 md:w-10 grid place-items-center rounded-lg hover:bg-stone-100" aria-label="Mês anterior"><ChevronLeft className="h-5 w-5" /></Link>
          <span className="font-semibold min-w-32 md:min-w-36 text-center text-sm md:text-base"><span className="capitalize">{title}</span> de {y}</span>
          <Link href={`/agenda?m=${shiftMonth(month, 1)}&view=${view}`} className="h-9 w-9 md:h-10 md:w-10 grid place-items-center rounded-lg hover:bg-stone-100" aria-label="Próximo mês"><ChevronRight className="h-5 w-5" /></Link>
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <div className="hidden md:flex items-center gap-3 text-xs text-muted">
            {(["QUOTE", "PRE_RESERVED", "CONFIRMED", "DONE"] as EventStatus[]).map((s) => (
              <span key={s} className="inline-flex items-center gap-1"><span className={cn("h-2 w-2 rounded-full", dotClass[s])} /> {EVENT_STATUS_LABEL[s]}</span>
            ))}
          </div>
          <div className="flex rounded-xl border border-border bg-surface p-0.5 text-sm">
            {(["list", "week", "month"] as const).map((v) => (
              <button key={v} type="button" onClick={() => setView(v)} className={cn("px-2.5 md:px-3 py-1.5 rounded-lg font-medium text-xs md:text-sm", view === v ? "bg-brand text-brand-fg" : "text-muted")}>
                {v === "list" ? "Lista" : v === "week" ? "Semana" : "Mês"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === "list" ? (
        monthEvents.length === 0 ? (
          <EmptyState title="Nenhum evento neste mês" description="Comece por um orçamento; reserve a data quando o cliente sinalizar." action={<Link href={`/eventos/novo?date=${dayKey(month, 1)}`} className={buttonClass("primary", "sm")}><Plus className="h-4 w-4" /> Adicionar evento</Link>} />
        ) : (
          <div className="space-y-4">
            {Array.from(byDay.entries()).filter(([k]) => k.startsWith(month)).sort().map(([day, list]) => (
              <DayGroup key={day} day={day} list={list} today={today} isOwner={isOwner} />
            ))}
          </div>
        )
      ) : null}

      {view === "month" ? (
        <MonthGrid month={month} byDay={byDay} today={today} onOpen={setOpenDay} />
      ) : null}

      {view === "week" ? (
        <WeekView selected={selected} setSelected={setSelected} byDay={byDay} today={today} isOwner={isOwner} />
      ) : null}

      {openDay ? (
        <div className="fixed inset-0 z-40 bg-black/30 flex items-end md:items-center justify-center p-0 md:p-6" onClick={() => setOpenDay(null)}>
          <div className="w-full md:max-w-md rounded-t-2xl md:rounded-2xl bg-surface border border-border p-4 max-h-[80dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Eventos do dia">
            <div className="flex justify-end -mt-1 -mr-1 mb-1"><button type="button" onClick={() => setOpenDay(null)} className="h-9 w-9 grid place-items-center rounded-lg hover:bg-stone-100" aria-label="Fechar"><X className="h-5 w-5" /></button></div>
            <DayGroup day={openDay} list={byDay.get(openDay) ?? []} today={today} showEmpty isOwner={isOwner} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** One month = one screen: always 6 rows, each day shows the number, up to 2 events and "+N mais". Clicking opens the day. */
function MonthGrid({ month, byDay, today, onOpen }: { month: string; byDay: Map<string, AgendaEvent[]>; today: string; onOpen: (day: string) => void }) {
  const first = dayKey(month, 1);
  const start = shiftDay(first, -weekdayOf(first));
  const cells = Array.from({ length: 42 }, (_, i) => shiftDay(start, i));
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="grid grid-cols-7 text-center text-[11px] uppercase tracking-wide text-muted pb-1">{WEEKDAYS.map((d) => <div key={d}>{d}</div>)}</div>
      <div className="flex-1 min-h-0 grid grid-cols-7 grid-rows-6 gap-1">
        {cells.map((key) => {
          const list = byDay.get(key) ?? [];
          const inMonth = key.startsWith(month);
          const isToday = key === today;
          const extra = list.length - 2;
          return (
            <button key={key} type="button" onClick={() => onOpen(key)}
              className={cn("min-h-0 overflow-hidden rounded-lg border text-left px-1 py-0.5 flex flex-col gap-0.5",
                "bg-surface border-border hover:border-brand/50", !inMonth && "text-muted",
                isToday && "border-brand ring-1 ring-brand/40")}>
              <span className={cn("text-xs leading-none", isToday ? "font-bold text-brand" : inMonth ? "font-medium" : "text-stone-400")}>{Number(key.slice(-2))}</span>
              {list.slice(0, 2).map((e) => (
                <span key={e.id} className={cn("hidden sm:block truncate rounded border px-1 text-[11px] leading-4", pillClass[e.status])}>{formatTime(e.starts_at)} {label(e)}</span>
              ))}
              {list.length > 0 ? <span className="sm:hidden flex gap-0.5">{list.slice(0, 3).map((e) => <span key={e.id} className={cn("h-1.5 w-1.5 rounded-full", dotClass[e.status])} />)}</span> : null}
              {extra > 0 ? <span className="hidden sm:block text-[11px] leading-4 text-muted">+{extra} mais</span> : null}
            </button>
          );
        })}
      </div>
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
  const wd = WEEKDAYS[weekdayOf(day)];
  return (
    <section>
      <div className="flex items-center justify-between mb-1.5">
        <h3 className={cn("text-sm font-semibold", day === today && "text-brand")}>{wd}, {d}/{m}{compact ? "" : `/${y}`}{day === today ? " · hoje" : ""}</h3>
        <AddEvent day={day} list={list} isOwner={isOwner} />
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
