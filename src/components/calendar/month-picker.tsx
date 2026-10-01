"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const MONTHS_PT = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
function daysInMonth(month: string) { const [y, m] = month.split("-").map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
function weekdayOf(key: string) { const [y, m, d] = key.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); }
export function fmtBrDate(key: string) { const [y, m, d] = key.split("-"); return `${d}/${m}/${y}`; }

type Props = {
  month: string;
  onMonthChange: (m: string) => void;
  date: string;
  onDateChange: (d: string) => void;
  today: string;
  busy: Set<string>;
  loading?: boolean;
  /** When true (owner), busy days stay clickable and are flagged instead of disabled. */
  allowBusy?: boolean;
  variant?: "public" | "app";
};

/** Month grid with past days greyed and busy days struck through. Shared by the public wizard and the app. */
export function MonthPicker({ month, onMonthChange, date, onDateChange, today, busy, loading = false, allowBusy = false, variant = "app" }: Props) {
  const pub = variant === "public";
  const navBtn = pub ? "h-10 w-10 grid place-items-center rounded-full bg-white border disabled:opacity-30" : "h-10 w-10 grid place-items-center rounded-lg border border-border bg-surface disabled:opacity-30";
  return (
    <div className="mx-auto w-full max-w-sm space-y-1.5">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => onMonthChange(shiftMonth(month, -1))} disabled={month <= today.slice(0, 7)} className={navBtn} style={pub ? { borderColor: "#ece7dc" } : undefined} aria-label="Mês anterior"><ChevronLeft className="h-5 w-5" /></button>
        <span className={cn("font-bold text-lg", pub && "display")}><span className="capitalize">{MONTHS_PT[Number(month.slice(5)) - 1]}</span> de {month.slice(0, 4)}</span>
        <button type="button" onClick={() => onMonthChange(shiftMonth(month, 1))} className={navBtn} style={pub ? { borderColor: "#ece7dc" } : undefined} aria-label="Próximo mês"><ChevronRight className="h-5 w-5" /></button>
      </div>
      <div className={cn("grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-muted", loading && "opacity-60")}>{WEEKDAYS.map((d, i) => <div key={i}>{d}</div>)}</div>
      <div className={cn("grid grid-cols-7 gap-1", loading && "opacity-60")} role="grid" aria-busy={loading}>
        {Array.from({ length: weekdayOf(`${month}-01`) }).map((_, i) => <div key={`pad-${i}`} />)}
        {Array.from({ length: daysInMonth(month) }).map((_, i) => {
          const key = `${month}-${String(i + 1).padStart(2, "0")}`;
          const past = key < today;
          const isBusy = busy.has(key);
          const disabled = past || (isBusy && !allowBusy);
          const selected = key === date;
          return (
            <button type="button" key={key} disabled={disabled} onClick={() => onDateChange(key)} aria-label={`${fmtBrDate(key)}${isBusy ? ", ocupado" : ""}`}
              className={cn("h-10 rounded-lg text-sm font-bold grid place-items-center transition", selected ? "text-white" : disabled ? "cursor-not-allowed" : pub ? "bg-white hover:bg-[var(--paper-2)]" : "bg-surface border border-border hover:bg-stone-50")}
              style={selected ? { background: pub ? "var(--berry)" : "var(--brand)" } : isBusy ? { background: "#f1ede4", color: "#b5b0a4", textDecoration: "line-through" } : past ? { color: "#cfcac0" } : undefined}>
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
