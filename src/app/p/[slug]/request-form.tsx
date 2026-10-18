"use client";

import { useActionState } from "react";
import { FestaSelect } from "@/components/ui/select-menu";
import { submitPublicRequest, type PublicSubmitResult } from "@/lib/actions/public";
import type { ActionResult } from "@/lib/action-result";
import { Field, Input, Textarea } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";
import { LEAD_SOURCES } from "@/lib/pricing";
import { AppCta } from "@/components/public/app-section";

export function RequestForm({ slug, defaultSource }: { slug: string; defaultSource?: string }) {
  const [state, action] = useActionState<ActionResult<PublicSubmitResult> | undefined, FormData>(submitPublicRequest, undefined);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  if (state?.ok) return <div className="space-y-3"><Alert tone="success">{state.message}</Alert><AppCta /></div>;
  const known = LEAD_SOURCES.some((s) => s.value === defaultSource);
  return (
    <form action={action} className="space-y-4">
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      <input type="hidden" name="slug" value={slug} />
      {defaultSource && !known ? <input type="hidden" name="source" value={defaultSource} /> : null}
      <Field label="Seu nome" htmlFor="req_name" error={fe.name}><Input id="req_name" name="name" autoComplete="name" required /></Field>
      <Field label="WhatsApp" htmlFor="req_whatsapp" error={fe.whatsapp}><PhoneInput id="req_whatsapp" name="whatsapp" autoComplete="tel" required /></Field>
      <Field label="E-mail (opcional)" htmlFor="req_email" error={fe.email} hint="Mandamos o resumo do pedido e o link do app."><Input id="req_email" name="email" type="email" inputMode="email" autoComplete="email" placeholder="voce@email.com" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Data desejada" htmlFor="req_date" error={fe.desired_date}><Input id="req_date" name="desired_date" type="date" /></Field>
        <Field label="Horário" htmlFor="req_time"><Input id="req_time" name="desired_time" type="time" step={900} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Adultos" htmlFor="req_adults" error={fe.adults}><Input id="req_adults" name="adults" type="number" inputMode="numeric" min={0} /></Field>
        <Field label="Crianças" htmlFor="req_children" error={fe.children}><Input id="req_children" name="children" type="number" inputMode="numeric" min={0} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Aniversariante" htmlFor="req_celebrant"><Input id="req_celebrant" name="celebrant_name" placeholder="Nome" /></Field>
        <Field label="Nascimento" htmlFor="req_birth"><Input id="req_birth" name="celebrant_birth_date" type="date" /></Field>
      </div>
      {defaultSource && !known ? null : (
        <Field label="Como nos conheceu?" htmlFor="req_source">
          <FestaSelect id="req_source" name="source" defaultValue={known ? defaultSource : ""} options={LEAD_SOURCES} />
        </Field>
      )}
      <Field label="Mensagem" htmlFor="req_message"><Textarea id="req_message" name="message" placeholder="Tipo de festa, tema, dúvidas..." /></Field>
      <SubmitButton size="lg" className="w-full" pendingText="Enviando...">Enviar solicitação</SubmitButton>
      <p className="text-xs text-muted text-center">Enviar não reserva a data. O buffet entra em contato para combinar.</p>
    </form>
  );
}
