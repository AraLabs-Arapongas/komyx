"use client";

import { useActionState } from "react";
import { acceptContract } from "@/lib/actions/public";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";

export function AcceptForm({ token }: { token: string }) {
  const [state, action] = useActionState(acceptContract, undefined);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  if (state?.ok) return <Alert tone="success">{state.message}</Alert>;
  return (
    <form action={action} className="space-y-4">
      <p className="font-medium">Aceite do contrato</p>
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      <input type="hidden" name="token" value={token} />
      <Field label="Seu nome completo" htmlFor="accepted_name" error={fe.accepted_name}><Input id="accepted_name" name="accepted_name" autoComplete="name" required /></Field>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="agree" className="mt-1 h-4 w-4" required />
        <span>Li o contrato acima e concordo com todos os termos.{fe.agree ? <span className="block text-red-600">{fe.agree}</span> : null}</span>
      </label>
      <SubmitButton size="lg" className="w-full" pendingText="Registrando...">Aceitar contrato</SubmitButton>
      <p className="text-xs text-muted">O aceite registra seu nome, data e hora. Não substitui assinatura eletrônica certificada.</p>
    </form>
  );
}
