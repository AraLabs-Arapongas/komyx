"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "../actions";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";

export function ForgotPasswordForm({ expired }: { expired: boolean }) {
  const [state, action] = useActionState(requestPasswordReset, undefined);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <Card>
      <CardBody className="pt-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Esqueci minha senha</h2>
          <p className="text-sm text-muted">Digite o e-mail da sua conta. Enviamos um link para você criar uma nova senha.</p>
        </div>
        {state?.ok ? (
          <Alert tone="success">{state.message}</Alert>
        ) : (
          <form action={action} className="space-y-4">
            {expired && !state ? <Alert tone="info">Esse link já foi usado ou expirou. Peça um novo abaixo.</Alert> : null}
            {state && !state.ok ? <Alert>{state.error}</Alert> : null}
            <Field label="E-mail" htmlFor="email" error={fe.email}>
              <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required />
            </Field>
            <SubmitButton className="w-full" size="lg" pendingText="Enviando...">Enviar link</SubmitButton>
          </form>
        )}
        <p className="text-center text-sm text-muted">
          Lembrou a senha? <Link href="/login" className="text-brand font-medium">Entrar</Link>
        </p>
      </CardBody>
    </Card>
  );
}
