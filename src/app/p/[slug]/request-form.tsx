"use client";

import { useActionState } from "react";
import { submitPublicRequest } from "@/lib/actions/public";
import { Field, Input, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";

export function RequestForm({ slug }: { slug: string }) {
  const [state, action] = useActionState(submitPublicRequest, undefined);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  if (state?.ok) return <Alert tone="success">{state.message}</Alert>;
  return (
    <form action={action} className="space-y-4">
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      <input type="hidden" name="slug" value={slug} />
      <Field label="Seu nome" htmlFor="req_name" error={fe.name}><Input id="req_name" name="name" autoComplete="name" required /></Field>
      <Field label="WhatsApp" htmlFor="req_whatsapp" error={fe.whatsapp}><Input id="req_whatsapp" name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999" required /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Data desejada" htmlFor="req_date" error={fe.desired_date}><Input id="req_date" name="desired_date" type="date" /></Field>
        <Field label="Horário" htmlFor="req_time"><Input id="req_time" name="desired_time" type="time" step={900} /></Field>
      </div>
      <Field label="Quantidade de pessoas" htmlFor="req_participants" error={fe.participants}><Input id="req_participants" name="participants" type="number" inputMode="numeric" min={0} /></Field>
      <Field label="Mensagem" htmlFor="req_message"><Textarea id="req_message" name="message" placeholder="Tipo de festa, tema, dúvidas..." /></Field>
      <SubmitButton size="lg" className="w-full" pendingText="Enviando...">Enviar solicitação</SubmitButton>
      <p className="text-xs text-muted text-center">Enviar não reserva a data. O buffet entra em contato para combinar.</p>
    </form>
  );
}
