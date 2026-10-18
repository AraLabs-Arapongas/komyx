"use client";

import { useActionState } from "react";
import { adminCreateBuffet } from "@/lib/actions/admin";
import { Field, Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";
import { SelectMenu } from "@/components/ui/select-menu";

export function NewBuffetForm() {
  const [state, action] = useActionState(adminCreateBuffet, undefined);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form action={action} className="space-y-4">
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      <Field label="Nome do buffet" htmlFor="org_name" error={fe.org_name}><Input id="org_name" name="org_name" required /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Slug (opcional)" htmlFor="slug" error={fe.slug} hint="Vazio = gerado do nome"><Input id="slug" name="slug" placeholder="festa-e-cia" /></Field>
        <Field label="Plano" htmlFor="plan"><SelectMenu id="plan" name="plan" defaultValue="basic" options={[{ value: "basic", label: "Básico" }, { value: "premium", label: "Premium" }]} /></Field>
      </div>
      <Field label="WhatsApp do buffet (opcional)" htmlFor="whatsapp" error={fe.whatsapp}><PhoneInput id="whatsapp" name="whatsapp" /></Field>
      <hr className="border-border" />
      <p className="text-sm font-medium">Responsável (owner)</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nome" htmlFor="owner_name" error={fe.owner_name}><Input id="owner_name" name="owner_name" required /></Field>
        <Field label="E-mail" htmlFor="owner_email" error={fe.owner_email}><Input id="owner_email" name="owner_email" type="email" required /></Field>
      </div>
      <p className="text-sm text-muted">O responsável recebe um e-mail de boas-vindas com o link para criar a própria senha. Ninguém, nem o admin, fica sabendo a senha dele.</p>
      <SubmitButton pendingText="Criando...">Criar buffet e acesso</SubmitButton>
    </form>
  );
}
