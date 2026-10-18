"use client";

import { useActionState } from "react";
import { completeBillingData } from "@/lib/actions/subscription";
import { Field, Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";

/** CNPJ/CPF + WhatsApp on the paused screen, when there is no charge yet because they were missing. */
export function BillingDataForm({ document, whatsapp }: { document: string | null; whatsapp: string | null }) {
  const [state, action] = useActionState(completeBillingData, undefined);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form action={action} className="space-y-3 text-left">
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      {state?.ok ? <Alert tone="success">{state.message}</Alert> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="CNPJ / CPF do buffet" htmlFor="bd_document" error={fe.document}><Input id="bd_document" name="document" defaultValue={document ?? ""} inputMode="numeric" required /></Field>
        <Field label="WhatsApp do buffet" htmlFor="bd_whatsapp" error={fe.whatsapp}><PhoneInput id="bd_whatsapp" name="whatsapp" defaultValue={whatsapp} required /></Field>
      </div>
      <SubmitButton size="sm" pendingText="Salvando...">Salvar e gerar a cobrança</SubmitButton>
    </form>
  );
}
