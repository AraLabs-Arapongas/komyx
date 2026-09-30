"use client";

import { useActionState, useEffect, useRef } from "react";
import { addPayment } from "@/lib/actions/guests-payments";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";
import { PAYMENT_METHOD_LABEL } from "@/lib/labels";
import { toDateKey } from "@/lib/utils";

export function PaymentForm({ eventId }: { eventId: string }) {
  const [state, action] = useActionState(addPayment, undefined);
  const ref = useRef<HTMLFormElement>(null);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);

  return (
    <form ref={ref} action={action} className="space-y-3 border-t border-border pt-4">
      <p className="text-sm font-medium">Registrar pagamento</p>
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <input type="hidden" name="event_id" value={eventId} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor (R$)" htmlFor="amount" error={fe.amount}>
          <Input id="amount" name="amount" inputMode="decimal" placeholder="0,00" required />
        </Field>
        <Field label="Data" htmlFor="paid_at" error={fe.paid_at}>
          <Input id="paid_at" name="paid_at" type="date" defaultValue={toDateKey(new Date())} required />
        </Field>
      </div>
      <Field label="Forma" htmlFor="method">
        <Select id="method" name="method" defaultValue="PIX">
          {Object.entries(PAYMENT_METHOD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </Field>
      <Field label="Observação" htmlFor="payment_notes">
        <Textarea id="payment_notes" name="notes" className="min-h-16" placeholder="Ex.: entrada de 30%" />
      </Field>
      <SubmitButton size="sm" variant="secondary" pendingText="Salvando...">Adicionar pagamento</SubmitButton>
    </form>
  );
}
