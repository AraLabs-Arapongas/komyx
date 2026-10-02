"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { BILLING_PERIODS, MONTHLY_PRICE } from "@/lib/billing";
import { formatCurrency } from "@/lib/utils";

/** Single-plan price card with a commitment-period switch (mensal, 3, 6, 12 meses). Annual is preselected. */
export function PriceCard({ features }: { features: string[] }) {
  const [months, setMonths] = useState<number>(12);
  const period = BILLING_PERIODS.find((p) => p.months === months) ?? BILLING_PERIODS[0];
  const total = period.perMonth * period.months;
  const savings = (MONTHLY_PRICE - period.perMonth) * period.months;
  return (
    <div className="rounded-3xl bg-white border-2 p-6 max-md:p-4 space-y-4 max-md:space-y-3 shadow-[0_18px_50px_rgba(27,31,58,0.12)]" style={{ borderColor: "var(--berry)" }}>
      <div className="flex rounded-full p-1 gap-1" style={{ background: "var(--paper-2)" }} role="tablist" aria-label="Período do plano">
        {BILLING_PERIODS.map((p) => (
          <button key={p.months} type="button" role="tab" aria-selected={p.months === months} onClick={() => setMonths(p.months)} className="flex-1 rounded-full py-1.5 text-xs sm:text-sm font-extrabold transition" style={p.months === months ? { background: "var(--ink)", color: "#fff" } : { color: "var(--ink)" }}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <p className="display font-extrabold text-xl">Komyx completo</p>
          <p className="text-xs font-semibold" style={{ color: "var(--muted-ink)" }}>
            {period.months === 1 ? "Cobrado todo mês." : `${formatCurrency(total)} por ${period.months} meses, pagos de uma vez.`}
            {savings > 0 ? <span style={{ color: "#059669" }}> Você economiza {formatCurrency(savings)}.</span> : null}
          </p>
        </div>
        <p className="display font-extrabold text-4xl" style={{ color: "var(--berry)" }}>
          {formatCurrency(period.perMonth)}<span className="text-sm font-bold" style={{ color: "var(--muted-ink)" }}>/mês</span>
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm max-md:gap-x-3 max-md:gap-y-1.5 max-md:text-xs">
        {features.map((i) => <li key={i} className="flex gap-2"><Check className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "var(--mint)" }} /> {i}</li>)}
      </ul>
      <Link href={`/signup?periodo=${period.months}`} className="inline-flex w-full items-center justify-center h-14 rounded-full font-extrabold text-base" style={{ background: "var(--berry)", color: "#fff" }}>
        Criar meu buffet por {formatCurrency(period.perMonth)}/mês
      </Link>
    </div>
  );
}
