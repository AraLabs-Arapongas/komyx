import Link from "next/link";
import { LogOut, CreditCard } from "lucide-react";
import { formatDate } from "@/lib/utils";

export type Billing = { cycleStart: string | null; dueAt: string | null; status: string; plan: string };

function cycleProgress(b: Billing) {
  if (!b.cycleStart || !b.dueAt) return null;
  const start = new Date(b.cycleStart + "T00:00:00-03:00").getTime();
  const due = new Date(b.dueAt + "T23:59:59-03:00").getTime();
  const now = Date.now();
  const pct = Math.round(Math.min(Math.max(((now - start) / (due - start)) * 100, 0), 100));
  const daysLeft = Math.ceil((due - now) / 86_400_000);
  return { pct, daysLeft };
}

/** Who is logged in, sign out and the billing cycle at a glance. Used in the sidebar and in the mobile menu. */
export function AccountFooter({ name, email, role, billing, compact = false }: { name: string; email: string; role: string; billing: Billing; compact?: boolean }) {
  const p = cycleProgress(billing);
  const overdue = billing.status === "overdue" || (p !== null && p.daysLeft < 0);
  const soon = p !== null && p.daysLeft >= 0 && p.daysLeft <= 7;
  const barColor = overdue ? "bg-red-500" : soon ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className={compact ? "space-y-3" : "space-y-3 border-t border-border p-3"}>
      <Link href="/configuracoes" className="block rounded-xl border border-border bg-stone-50 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-medium inline-flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5 text-muted" /> Plano {billing.plan === "premium" ? "Premium" : "Básico"}</span>
          {p ? (
            <span className={overdue ? "text-red-600 font-medium" : soon ? "text-amber-700 font-medium" : "text-muted"}>
              {overdue ? `Vencida há ${Math.abs(p.daysLeft)} d` : p.daysLeft === 0 ? "Vence hoje" : `Vence em ${p.daysLeft} d`}
            </span>
          ) : <span className="text-muted">{billing.status === "trial" ? "Período de teste" : "Sem fatura"}</span>}
        </div>
        {p ? (
          <>
            <div className="mt-2 h-1.5 w-full rounded-full bg-stone-200 overflow-hidden" role="progressbar" aria-valuenow={Math.round(p.pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso do ciclo de cobrança">
              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${p.pct}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-muted">{formatDate(billing.cycleStart + "T12:00:00-03:00")} → {formatDate(billing.dueAt + "T12:00:00-03:00")}</p>
          </>
        ) : null}
      </Link>
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{name}</p>
          <p className="text-xs text-muted truncate">{email} · {role === "owner" ? "Proprietário" : "Equipe"}</p>
        </div>
        <form action="/auth/signout" method="post">
          <button className="h-9 w-9 grid place-items-center rounded-lg text-muted hover:bg-stone-100 hover:text-foreground" aria-label="Sair" title="Sair"><LogOut className="h-4 w-4" /></button>
        </form>
      </div>
    </div>
  );
}
