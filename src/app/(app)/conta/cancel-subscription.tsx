"use client";

import { useActionState, useState } from "react";
import { cancelSubscription } from "@/lib/actions/subscription";
import { buttonClass } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";

const REASONS = ["Vou parar com o buffet", "Está caro", "Faltam recursos", "Uso outro sistema", "Outro motivo"];

/** Soft cancel with a confirmation dialog: reason, what happens next, and typing CANCELAR. */
export function CancelSubscription({ accessHint }: { accessHint: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(cancelSubscription, undefined);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  if (state?.ok) return <Alert tone="success">{state.message}</Alert>;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass("ghost", "sm", "text-red-600")}>Cancelar assinatura</button>
      {open ? (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <form action={action} role="dialog" aria-label="Cancelar assinatura" className="w-full max-w-md rounded-2xl bg-surface border border-border p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div>
              <p className="font-semibold text-lg">Cancelar a assinatura do Komyx?</p>
              <ul className="mt-2 text-sm text-muted list-disc pl-5 space-y-1">
                <li>{accessHint}</li>
                <li>Sua página pública sai do ar na hora.</li>
                <li>Agenda, clientes, orçamentos e contratos ficam guardados por 90 dias.</li>
                <li>Pode reativar quando quiser, com tudo no lugar.</li>
              </ul>
            </div>
            {state && !state.ok ? <Alert>{state.error}</Alert> : null}
            <Field label="Por que está cancelando? (opcional)" htmlFor="cancel_reason">
              <Select id="cancel_reason" name="reason" defaultValue="">
                <option value="">Prefiro não dizer</option>
                {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </Select>
            </Field>
            <Field label='Digite CANCELAR para confirmar' htmlFor="cancel_confirm" error={fe.confirm}><Input id="cancel_confirm" name="confirm" autoComplete="off" placeholder="CANCELAR" /></Field>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className={buttonClass("outline", "sm")}>Voltar</button>
              <SubmitButton size="sm" className="bg-red-600 border-red-600 hover:bg-red-700" pendingText="Cancelando...">Cancelar assinatura</SubmitButton>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
