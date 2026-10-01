"use client";

import { useActionState } from "react";
import { adminUpdateOrganization, adminResetPassword } from "@/lib/actions/admin";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";

export function OrgAdminForm({ org }: { org: { id: string; slug: string; plan: string; status: string; notes: string | null } }) {
  const [state, action] = useActionState(adminUpdateOrganization, undefined);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  return (
    <form action={action} className="space-y-4">
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <input type="hidden" name="id" value={org.id} />
      <div className="grid grid-cols-3 gap-3">
        <Field label="Slug (/p/…)" htmlFor="slug" error={fe.slug}><Input id="slug" name="slug" defaultValue={org.slug} required /></Field>
        <Field label="Plano" htmlFor="plan"><Select id="plan" name="plan" defaultValue={org.plan}><option value="basic">Básico</option><option value="premium">Premium</option></Select></Field>
        <Field label="Status" htmlFor="status"><Select id="status" name="status" defaultValue={org.status}><option value="active">Ativo</option><option value="suspended">Suspenso</option></Select></Field>
      </div>
      <Field label="Notas internas (só o Festeja vê)" htmlFor="notes"><Textarea id="notes" name="notes" defaultValue={org.notes ?? ""} className="min-h-20" placeholder="Ex.: cliente desde a fase piloto, pagou anual" /></Field>
      <SubmitButton size="sm">Salvar</SubmitButton>
    </form>
  );
}

export function ResetPasswordForm({ userId, orgId }: { userId: string; orgId: string }) {
  const [state, action] = useActionState(adminResetPassword, undefined);
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-muted">Redefinir senha</summary>
      <form action={action} className="mt-2 flex flex-wrap items-end gap-2">
        {state && !state.ok ? <Alert>{state.error}</Alert> : null}
        {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
        <input type="hidden" name="user_id" value={userId} />
        <input type="hidden" name="org_id" value={orgId} />
        <Field label="Nova senha" htmlFor={`pw_${userId}`}><Input id={`pw_${userId}`} name="password" type="text" autoComplete="off" minLength={8} className="w-56" required /></Field>
        <SubmitButton size="sm" variant="outline">Redefinir</SubmitButton>
      </form>
    </details>
  );
}
