"use client";

import { useActionState } from "react";
import { CreditCard } from "lucide-react";
import { reactivateSubscription } from "@/lib/actions/subscription";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";
import { formatCurrency } from "@/lib/utils";

type Option = { months: number; label: string; total: number; perMonth: number };

/**
 * Cancelled buffet: "Pagar e reativar" on its plan, or another plan right below. Opens the Asaas payment
 * page; the buffet comes back once the payment is confirmed.
 */
export function ReactivateButton({ options, current, size = "md" }: { options: Option[]; current: number; size?: "sm" | "md" | "lg" }) {
  const [state, run] = useActionState(reactivateSubscription, undefined);
  const mine = options.find((o) => o.months === current) ?? options[0];
  return (
    <form action={run} className="space-y-3" data-testid="reactivate">
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      <SubmitButton name="months" value={String(mine.months)} size={size} pendingText="Abrindo o pagamento..."><CreditCard className="h-4 w-4" /> Pagar {formatCurrency(mine.total)} e reativar</SubmitButton>
      <p className="text-xs text-muted">Pix, boleto ou cartão. Assim que o pagamento for confirmado, tudo volta sozinho.</p>
      <div className="space-y-2">
        <p className="text-sm font-semibold">Ou volte em outro plano</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {options.filter((o) => o.months !== mine.months).map((o) => (
            <SubmitButton key={o.months} name="months" value={String(o.months)} variant="outline" size="md" className="h-auto py-2.5 flex-col items-start gap-0.5 text-left" pendingText="Abrindo o pagamento...">
              <span className="font-semibold">{o.label} · {formatCurrency(o.total)}</span>
              <span className="text-xs text-muted font-normal">{o.months > 1 ? `${formatCurrency(o.perMonth)}/mês · ` : ""}pagar e reativar</span>
            </SubmitButton>
          ))}
        </div>
      </div>
    </form>
  );
}
