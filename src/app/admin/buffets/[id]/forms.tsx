"use client";

import { useActionState } from "react";
import { adminUpdateOrganization, adminResetPassword, adminSendPasswordReset, adminAccessLink } from "@/lib/actions/admin";
import { Field, Input, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";
import { SelectMenu } from "@/components/ui/select-menu";

export function OrgAdminForm({ org }: { org: { id: string; slug: string; plan: string; status: string; notes: string | null; billing_cycle_start: string | null; billing_due_at: string | null; billing_status: string } }) {
  const [state, action] = useActionState(adminUpdateOrganization, undefined);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form action={action} className="space-y-4">
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <input type="hidden" name="id" value={org.id} />
      <div className="grid grid-cols-3 gap-3">
        <Field label="Slug (/p/…)" htmlFor="slug" error={fe.slug}><Input id="slug" name="slug" defaultValue={org.slug} required /></Field>
        <Field label="Plano" htmlFor="plan"><SelectMenu id="plan" name="plan" defaultValue={org.plan} options={[{ value: "basic", label: "Básico" }, { value: "premium", label: "Premium" }]} /></Field>
        <Field label="Status" htmlFor="status"><SelectMenu id="status" name="status" defaultValue={org.status} options={[{ value: "active", label: "Ativo" }, { value: "suspended", label: "Suspenso" }, { value: "cancelled", label: "Cancelado (pela dona)" }]} /></Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Início do ciclo" htmlFor="billing_cycle_start"><Input id="billing_cycle_start" name="billing_cycle_start" type="date" defaultValue={org.billing_cycle_start ?? ""} /></Field>
        <Field label="Vencimento da fatura" htmlFor="billing_due_at"><Input id="billing_due_at" name="billing_due_at" type="date" defaultValue={org.billing_due_at ?? ""} /></Field>
        <Field label="Cobrança" htmlFor="billing_status"><SelectMenu id="billing_status" name="billing_status" defaultValue={org.billing_status} options={[{ value: "ok", label: "Em dia" }, { value: "trial", label: "Teste grátis" }, { value: "due", label: "A vencer" }, { value: "overdue", label: "Vencida" }]} /></Field>
      </div>
      <Field label="Notas internas (só o Komyx vê)" htmlFor="notes"><Textarea id="notes" name="notes" defaultValue={org.notes ?? ""} className="min-h-20" placeholder="Ex.: cliente desde a fase piloto, pagou anual" /></Field>
      <SubmitButton size="sm">Salvar</SubmitButton>
    </form>
  );
}

export function ResetPasswordForm({ userId, orgId }: { userId: string; orgId: string }) {
  const [state, action] = useActionState(adminResetPassword, undefined);
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-muted">Definir senha provisória</summary>
      <form action={action} className="mt-2 space-y-2">
        <p className="text-xs text-muted">Para quando a pessoa não consegue usar o e-mail. Ela recebe um aviso (sem a senha) e cria a dela no próximo acesso. Passe a provisória por telefone.</p>
        <input type="hidden" name="user_id" value={userId} />
        <input type="hidden" name="org_id" value={orgId} />
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Senha provisória" htmlFor={`pw_${userId}`}><Input id={`pw_${userId}`} name="password" type="text" autoComplete="off" minLength={8} className="w-56" required /></Field>
          <SubmitButton size="sm" variant="outline" pendingText="Definindo...">Definir</SubmitButton>
        </div>
        {state && !state.ok ? <Alert>{state.error}</Alert> : null}
        {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      </form>
    </details>
  );
}

/** Local/staging only: shows a "create your password" link, since e-mail is not delivered there. */
export function AccessLinkForm({ userId }: { userId: string }) {
  const [state, action] = useActionState(adminAccessLink, undefined);
  return (
    <form action={action} className="space-y-2 text-sm">
      <input type="hidden" name="user_id" value={userId} />
      <SubmitButton size="sm" variant="outline" pendingText="Gerando...">Gerar link de acesso (teste)</SubmitButton>
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      {state?.ok && state.data?.link ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs space-y-1">
          <p>Fora de produção o e-mail não sai. Abra este link numa janela anônima para criar a senha (vale 1 hora, uma vez):</p>
          <a href={state.data.link} target="_blank" rel="noopener" className="break-all text-brand underline">{state.data.link}</a>
        </div>
      ) : null}
    </form>
  );
}

export function SendResetForm({ userId, orgId }: { userId: string; orgId: string }) {
  const [state, action] = useActionState(adminSendPasswordReset, undefined);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="user_id" value={userId} />
      <input type="hidden" name="org_id" value={orgId} />
      <SubmitButton size="sm" variant="outline" pendingText="Enviando…">Reenviar e-mail de senha</SubmitButton>
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
    </form>
  );
}
