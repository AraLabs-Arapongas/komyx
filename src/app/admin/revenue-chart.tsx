"use client";

import { Tooltip } from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/utils";

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Komyx money received per month (bars) with the paying buffets at the end of each month in the tooltip. */
export function RevenueChart({ series }: { series: { month: string; received: number; paying: number }[] }) {
  const max = Math.max(1, ...series.map((s) => s.received));
  return (
    <div className="flex h-40 items-end gap-1.5" role="img" aria-label="Receita recebida por mês nos últimos 12 meses">
      {series.map((s) => {
        const [y, m] = s.month.split("-").map(Number);
        const label = `${MONTHS[m - 1]}${m === 1 ? ` ${String(y).slice(2)}` : ""}`;
        return (
          <Tooltip key={s.month} className="flex-1 h-full flex flex-col justify-end items-center gap-1 outline-none" content={<><span className="font-medium">{MONTHS[m - 1]} de {y}</span><br /><span className="text-stone-300">{formatCurrency(s.received)} recebidos · {s.paying} {s.paying === 1 ? "pagante" : "pagantes"}</span></>}>
            <span className="w-full rounded-t-md bg-brand/80 hover:bg-brand transition-colors" style={{ height: `${Math.max(s.received ? 6 : 2, (s.received / max) * 100)}%`, opacity: s.received ? 1 : 0.25 }} />
            <span className="text-[10px] text-muted">{label}</span>
          </Tooltip>
        );
      })}
    </div>
  );
}
