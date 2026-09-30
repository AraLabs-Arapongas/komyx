"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup } from "../actions";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";

export function SignupForm() {
  const [state, action] = useActionState(signup, undefined);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <Card>
      <CardBody className="pt-5 space-y-4">
        <form action={action} className="space-y-4">
          {state && !state.ok ? <Alert>{state.error}</Alert> : null}
          {state && state.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
          <Field label="Nome do buffet" htmlFor="org_name" error={fe.org_name}>
            <Input id="org_name" name="org_name" placeholder="Ex.: Festa & Cia" required />
          </Field>
          <Field label="Seu nome" htmlFor="name" error={fe.name}>
            <Input id="name" name="name" autoComplete="name" required />
          </Field>
          <Field label="E-mail" htmlFor="email" error={fe.email}>
            <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required />
          </Field>
          <Field label="Senha" htmlFor="password" error={fe.password} hint="Mínimo de 8 caracteres">
            <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
          </Field>
          <SubmitButton className="w-full" size="lg" pendingText="Criando...">Criar meu buffet</SubmitButton>
        </form>
        <p className="text-center text-sm text-muted">
          Já tem conta? <Link href="/login" className="text-brand font-medium">Entrar</Link>
        </p>
      </CardBody>
    </Card>
  );
}
