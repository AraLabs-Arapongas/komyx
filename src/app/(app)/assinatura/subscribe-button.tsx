"use client";

import { useActionState } from "react";
import { ExternalLink } from "lucide-react";
import { subscribeNow } from "@/lib/actions/subscription";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";

/** "Assinar": creates the Asaas subscription and opens its first charge on the Asaas page. */
export function SubscribeButton({ months }: { months: number }) {
  const [state, run] = useActionState(subscribeNow, undefined);
  return (
    <form action={run} className="space-y-2">
      {state ? (state.ok ? <Alert tone="success">{state.message}</Alert> : <Alert>{state.error}</Alert>) : null}
      <input type="hidden" name="months" value={String(months)} />
      <SubmitButton size="md" pendingText="Abrindo o pagamento...">Assinar <ExternalLink className="h-4 w-4" /></SubmitButton>
    </form>
  );
}
