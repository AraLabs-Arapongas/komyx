"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "../actions";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";

export function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
  const [state, action] = useActionState(login, undefined);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <Card>
      <CardBody className="pt-5 space-y-4">
        <form action={action} className="space-y-4">
          {next ? <input type="hidden" name="next" value={next} /> : null}
          {(state && !state.ok) || initialError ? <Alert>{initialError ?? (state && !state.ok ? state.error : "")}</Alert> : null}
          <Field label="E-mail" htmlFor="email" error={fe.email}>
            <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required />
          </Field>
          <Field label="Senha" htmlFor="password" error={fe.password}>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </Field>
          <SubmitButton className="w-full" size="lg" pendingText="Entrando...">Entrar</SubmitButton>
        </form>
        <p className="text-center text-sm text-muted">
          Ainda não tem conta? <Link href="/signup" className="text-brand font-medium">Criar buffet</Link>
        </p>
      </CardBody>
    </Card>
  );
}
