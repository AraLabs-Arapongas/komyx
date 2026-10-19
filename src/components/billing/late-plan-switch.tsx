"use client";

import { useActionState } from "react";
import { switchPlanAndPay } from "@/lib/actions/subscription";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";
import { formatCurrency } from "@/lib/utils";

type Option = { months: number; label: string; total: number; perMonth: number };

/** Late: the other plans, always open below Pagar. Picking a plan replaces the late charge and opens the payment. */
export function LatePlanSwitch({ options, current }: { options: Option[]; current: number }) {
  const [state, run] = useActionState(switchPlanAndPay, undefined);
  return (
    <div data-testid="late-plan-switch" className="space-y-2">
      <p className="text-sm font-semibold">Ou mude o plano</p>
      <form action={run} className="space-y-2">
        {state && !state.ok ? <Alert>{state.error}</Alert> : null}
        <p className="text-xs text-muted">Escolha o plano e pague por ele no lugar da fatura atrasada.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {options.filter((o) => o.months !== current).map((o) => (
            <SubmitButton key={o.months} name="months" value={String(o.months)} variant="outline" size="md" className="h-auto py-2.5 flex-col items-start gap-0.5 text-left" pendingText="Abrindo o pagamento...">
              <span className="font-semibold">{o.label} · {formatCurrency(o.total)}</span>
              <span className="text-xs text-muted font-normal">{o.months > 1 ? `${formatCurrency(o.perMonth)}/mês · ` : ""}pagar agora</span>
            </SubmitButton>
          ))}
        </div>
      </form>
    </div>
  );
}
