"use client";

import { useActionState } from "react";
import { setNewPassword } from "../actions";
import { Card, CardBody } from "@/components/ui/card";
import { Field } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";
import { PasswordInput } from "@/components/ui/password-input";

export function NewPasswordForm({ required = false }: { required?: boolean }) {
  const [state, action] = useActionState(setNewPassword, undefined);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <Card>
      <CardBody className="pt-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">{required ? "Crie sua senha" : "Criar nova senha"}</h2>
          <p className="text-sm text-muted">{required ? "Você entrou com uma senha provisória do suporte. Escolha a sua para continuar." : "Escolha a nova senha da sua conta. Depois você já entra no Komyx."}</p>
        </div>
        <form action={action} className="space-y-4">
          {state && !state.ok ? <Alert>{state.error}</Alert> : null}
          <Field label="Nova senha" htmlFor="password" error={fe.password} hint="Pelo menos 8 caracteres">
            <PasswordInput id="password" name="password" autoComplete="new-password" minLength={8} required />
          </Field>
          <Field label="Repita a nova senha" htmlFor="confirm_password" error={fe.confirm_password}>
            <PasswordInput id="confirm_password" name="confirm_password" autoComplete="new-password" minLength={8} required />
          </Field>
          <SubmitButton className="w-full" size="lg" pendingText="Salvando...">Salvar e entrar</SubmitButton>
        </form>
      </CardBody>
    </Card>
  );
}
