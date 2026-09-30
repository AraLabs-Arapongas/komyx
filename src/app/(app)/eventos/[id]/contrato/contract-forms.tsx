"use client";

import { useActionState } from "react";
import { updateContractContent, changeContractStatus } from "@/lib/actions/contracts";
import { Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";

export function ContractEditor({ id, eventId, content }: { id: string; eventId: string; content: string }) {
  const [state, action] = useActionState(updateContractContent, undefined);
  return (
    <form action={action} className="space-y-3">
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      {state?.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="event_id" value={eventId} />
      <Textarea name="content" defaultValue={content} className="min-h-[60vh] font-mono text-xs leading-relaxed" />
      <SubmitButton size="sm">Salvar texto</SubmitButton>
    </form>
  );
}

export function ContractStatusForm({ id, eventId, status }: { id: string; eventId: string; status: string }) {
  const [state, action] = useActionState(changeContractStatus, undefined);
  const btn = (to: string, label: string, variant: "primary" | "outline" | "ghost" = "outline", cls?: string) => (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="status" value={to} />
      <SubmitButton size="sm" variant={variant} className={cls}>{label}</SubmitButton>
    </form>
  );
  return (
    <div className="space-y-2">
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      <div className="flex flex-wrap gap-2">
        {status === "DRAFT" ? btn("SENT", "Marcar como enviado", "primary") : null}
        {status === "SENT" ? btn("DRAFT", "Voltar a rascunho") : null}
        {status !== "CANCELLED" && status !== "ACCEPTED" ? btn("CANCELLED", "Cancelar contrato", "ghost", "text-red-600") : null}
        {status === "CANCELLED" ? btn("DRAFT", "Reativar") : null}
      </div>
    </div>
  );
}
