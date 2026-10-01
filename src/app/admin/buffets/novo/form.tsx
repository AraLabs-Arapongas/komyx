"use client";

import { useActionState } from "react";
import { adminCreateBuffet } from "@/lib/actions/admin";
import { Field, Input, Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";

export function NewBuffetForm() {
  const [state, action] = useActionState(adminCreateBuffet, undefined);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form action={action} className="space-y-4">
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      <Field label="Nome do buffet" htmlFor="org_name" error={fe.org_name}><Input id="org_name" name="org_name" required /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Slug (opcional)" htmlFor="slug" error={fe.slug} hint="Vazio = gerado do nome"><Input id="slug" name="slug" placeholder="festa-e-cia" /></Field>
        <Field label="Plano" htmlFor="plan"><Select id="plan" name="plan" defaultValue="basic"><option value="basic">Básico</option><option value="premium">Premium</option></Select></Field>
      </div>
      <Field label="WhatsApp do buffet (opcional)" htmlFor="whatsapp" error={fe.whatsapp}><Input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" /></Field>
      <hr className="border-border" />
      <p className="text-sm font-medium">Responsável (owner)</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nome" htmlFor="owner_name" error={fe.owner_name}><Input id="owner_name" name="owner_name" required /></Field>
        <Field label="E-mail" htmlFor="owner_email" error={fe.owner_email}><Input id="owner_email" name="owner_email" type="email" required /></Field>
      </div>
      <Field label="Senha inicial" htmlFor="owner_password" error={fe.owner_password} hint="Mínimo 8 caracteres. Envie ao responsável; ele pode trocar depois."><Input id="owner_password" name="owner_password" type="text" autoComplete="off" minLength={8} required /></Field>
      <SubmitButton pendingText="Criando...">Criar buffet e acesso</SubmitButton>
    </form>
  );
}
