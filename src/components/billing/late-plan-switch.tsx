"use client";

import { useActionState } from "react";
import { switchPlanAndPay } from "@/lib/actions/subscription";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";
import { formatCurrency } from "@/lib/utils";

type Option = { months: number; label: string; total: number; perMonth: number };

/** Late: "Alterar o plano" next to Pagar. Picking a plan replaces the late charge and opens the payment. */
export function LatePlanSwitch({ options, current }: { options: Option[]; current: number }) {
  const [state, run] = useActionState(switchPlanAndPay, undefined);
  return (
    <details className="group" data-testid="late-plan-switch" open={Boolean(state && !state.ok)}>
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-sm font-semibold text-brand hover:underline [&::-webkit-details-marker]:hidden">
        Alterar o plano <span className="text-xs transition-transform group-open:rotate-180">▾</span>
      </summary>
      <form action={run} className="mt-3 space-y-2">
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
    </details>
  );
}
