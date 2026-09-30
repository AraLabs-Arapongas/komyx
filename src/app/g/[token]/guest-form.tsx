"use client";

import { useActionState } from "react";
import { confirmGuest } from "@/lib/actions/public";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";

export function GuestForm({ token }: { token: string }) {
  const [state, action] = useActionState(confirmGuest, undefined);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  if (state?.ok) return <Alert tone="success">{state.message}</Alert>;
  return (
    <form action={action} className="space-y-4">
      <p className="font-medium">Confirme sua presença</p>
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      <input type="hidden" name="token" value={token} />
      <Field label="Seu nome" htmlFor="g_name" error={fe.name}><Input id="g_name" name="name" autoComplete="name" required /></Field>
      <Field label="Quantas pessoas (incluindo você)" htmlFor="g_participants" error={fe.participants}><Input id="g_participants" name="participants" type="number" inputMode="numeric" min={1} max={50} defaultValue={1} required /></Field>
      <Field label="Observação (opcional)" htmlFor="g_notes" hint="Ex.: restrição alimentar, criança pequena"><Input id="g_notes" name="notes" /></Field>
      <SubmitButton size="lg" className="w-full" pendingText="Confirmando...">Confirmar presença</SubmitButton>
    </form>
  );
}
