"use client";

import { useActionState } from "react";
import { ExternalLink } from "lucide-react";
import { payInvoice } from "@/lib/actions/subscription";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";
import { formatCurrency } from "@/lib/utils";

/** "Pagar R$ X": opens the invoice on the Asaas page (creating the Asaas charge first if it has none). */
export function PayButton({ invoiceId, amount, label = "Pagar" }: { invoiceId: string; amount: number; label?: string }) {
  const [state, run] = useActionState(payInvoice, undefined);
  return (
    <form action={run} className="space-y-2">
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      <input type="hidden" name="id" value={invoiceId} />
      <SubmitButton size="md" pendingText="Abrindo o pagamento...">{label} {formatCurrency(amount)} <ExternalLink className="h-4 w-4" /></SubmitButton>
    </form>
  );
}
