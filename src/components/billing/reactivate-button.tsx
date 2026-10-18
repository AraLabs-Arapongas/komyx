"use client";

import { useActionState } from "react";
import { CreditCard } from "lucide-react";
import { reactivateSubscription } from "@/lib/actions/subscription";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";
import { formatCurrency } from "@/lib/utils";

/** Cancelled buffet: opens the Asaas payment page; the buffet comes back once the payment is confirmed. */
export function ReactivateButton({ amount, size = "sm" }: { amount: number; size?: "sm" | "md" | "lg" }) {
  const [state, run] = useActionState(reactivateSubscription, undefined);
  return (
    <form action={run} className="space-y-2">
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      <SubmitButton size={size} pendingText="Abrindo o pagamento..."><CreditCard className="h-4 w-4" /> Pagar {formatCurrency(amount)} e reativar</SubmitButton>
      <p className="text-xs text-muted">Abre a página de pagamento (Pix, boleto ou cartão). Assim que o pagamento for confirmado, tudo volta sozinho.</p>
    </form>
  );
}
