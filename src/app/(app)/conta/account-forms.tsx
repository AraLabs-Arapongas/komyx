"use client";

import { useActionState, useEffect, useRef } from "react";
import { updateMyName, changeMyPassword, setEmailNotifications } from "@/lib/actions/account";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";

export function NameForm({ name, email }: { name: string; email: string }) {
  const [state, action] = useActionState(updateMyName, undefined);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form action={action} className="space-y-3">
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Nome" htmlFor="acc_name" error={fe.name}><Input id="acc_name" name="name" defaultValue={name} required /></Field>
        <Field label="E-mail" htmlFor="acc_email" hint="É o seu login. Para trocar, fale com o suporte."><Input id="acc_email" value={email} disabled /></Field>
      </div>
      <SubmitButton size="sm" variant="outline" pendingText="Salvando...">Salvar nome</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changeMyPassword, undefined);
  const ref = useRef<HTMLFormElement>(null);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-3">
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Senha atual" htmlFor="current_password" error={fe.current_password}><Input id="current_password" name="current_password" type="password" autoComplete="current-password" required /></Field>
        <Field label="Nova senha" htmlFor="new_password" error={fe.new_password} hint="Mínimo de 8 caracteres"><Input id="new_password" name="new_password" type="password" autoComplete="new-password" required minLength={8} /></Field>
        <Field label="Confirmar nova senha" htmlFor="confirm_password" error={fe.confirm_password}><Input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" required /></Field>
      </div>
      <SubmitButton size="sm" variant="outline" pendingText="Alterando...">Alterar senha</SubmitButton>
    </form>
  );
}

export function EmailNotificationsForm({ enabled }: { enabled: boolean }) {
  const [state, action, pending] = useActionState(setEmailNotifications, undefined);
  return (
    <form action={action} className="space-y-3">
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="email_notifications" defaultChecked={enabled} disabled={pending} onChange={(e) => e.currentTarget.form?.requestSubmit()} className="mt-0.5 h-4 w-4 accent-[var(--brand)]" />
        <span>Receber avisos por e-mail<span className="block text-xs text-muted">Pedidos de orçamento, reservas online, contratos aceitos e pedidos dos clientes.</span></span>
      </label>
    </form>
  );
}
