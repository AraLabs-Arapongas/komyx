"use client";

import { useActionState } from "react";
import { choosePlan, undoPlanChange } from "@/lib/actions/subscription";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";
import type { ActionResult } from "@/lib/action-result";

type Option = { months: number; label: string; total: number; perMonth: number; hint: string };

/**
 * Plan change, always open under "Trocar de plano" (the subscription itself is shown above it): the 4 plans with
 * the current one marked. In the trial a choice applies at once; after a payment it is scheduled for the
 * next renewal ("A partir de DD/MM: plano X" + Desfazer).
 */
export function PlanCard({ options, current, pending, trial, cancelled }: {
  options: Option[];
  current: number;
  pending: { months: number; label: string; from: string } | null;
  trial: boolean;
  cancelled: boolean;
}) {
  // One state for the three forms, so the message shown is always the last answer.
  const [msg, run] = useActionState(async (_prev: ActionResult | undefined, fd: FormData) => {
    const op = fd.get("op");
    return op === "undo" ? undoPlanChange() : choosePlan(undefined, fd);
  }, undefined);
  return (
    <div className="space-y-3" data-testid="plan-card">
      {msg ? (msg.ok ? <Alert tone="success">{msg.message}</Alert> : <Alert>{msg.error}</Alert>) : null}
      {pending ? (
        <form action={run} className="rounded-xl border border-brand/20 bg-brand-soft px-3.5 py-2.5 text-sm flex flex-wrap items-center justify-between gap-2" data-testid="pending-plan">
          <input type="hidden" name="op" value="undo" />
          <span>A partir de <b>{pending.from}</b>: plano <b>{pending.label}</b>. O que já foi pago segue até lá.</span>
          <SubmitButton size="sm" variant="outline" pendingText="Desfazendo...">Desfazer</SubmitButton>
        </form>
      ) : null}
      {cancelled ? null : (
      <div data-testid="change-plan">
        <p className="text-sm font-semibold">Trocar de plano</p>
        <p className="mt-2 mb-2 text-xs text-muted">{trial ? "Antes do primeiro pagamento, o plano escolhido vale na hora." : "Vale a partir da próxima cobrança."}</p>
      <form action={run} className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {options.map((o) => {
          const isCurrent = o.months === current;
          const isPending = pending?.months === o.months;
          return (
            <div key={o.months} data-plan={o.months} className={cn("rounded-xl border p-3 flex flex-col gap-1", isCurrent ? "border-brand ring-1 ring-brand bg-brand-soft/40" : "border-border")}>
              <div className="flex items-center justify-between gap-1">
                <p className="font-semibold">{o.label}</p>
                {isCurrent ? <Badge tone="brand">Seu plano</Badge> : isPending ? <Badge tone="amber">Agendado</Badge> : null}
              </div>
              <p className="text-lg font-semibold leading-tight">{formatCurrency(o.total)}</p>
              <p className="text-xs text-muted">{o.hint}{o.months > 1 ? ` · ${formatCurrency(o.perMonth)}/mês` : ""}</p>
              {!isCurrent && !isPending && !cancelled ? (
                <SubmitButton name="months" value={String(o.months)} size="sm" variant="outline" className="mt-1 h-8 text-xs" pendingText="Trocando...">Escolher</SubmitButton>
              ) : null}
            </div>
          );
        })}
      </form>
      </div>
      )}
    </div>
  );
}
