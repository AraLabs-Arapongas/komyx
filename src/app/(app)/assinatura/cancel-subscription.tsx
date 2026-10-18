"use client";

import { useActionState, useState } from "react";
import { cancelSubscription } from "@/lib/actions/subscription";
import { buttonClass } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";
import { SelectMenu } from "@/components/ui/select-menu";

const REASONS = ["Vou parar com o buffet", "Está caro", "Faltam recursos", "Uso outro sistema", "Outro motivo"];

/**
 * Cancel with a confirmation dialog: nothing else is charged and the access goes to the end of what is
 * paid. Refunds, when due, are done by the Komyx admin in the Asaas panel. Reason + typing CANCELAR.
 */
export function CancelSubscription({ accessUntil }: { accessUntil: string | null }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(cancelSubscription, undefined);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  if (state?.ok) return <Alert tone="success">{state.message}</Alert>;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-sm font-semibold text-red-600 hover:underline">Cancelar</button>
      {open ? (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <form action={action} role="dialog" aria-label="Cancelar assinatura" className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-surface border border-border p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div>
              <p className="font-semibold text-lg">Cancelar a assinatura do Komyx?</p>
            </div>
            <input type="hidden" name="option" value="keep" />
            <p className="text-sm" data-testid="cancel-summary">Nada mais é cobrado. {accessUntil ? `Você usa o Komyx até ${accessUntil}.` : ""}</p>
            <ul className="text-sm text-muted list-disc pl-5 space-y-1">
              <li>Depois disso, a página pública sai do ar.</li>
              <li>Agenda, clientes, orçamentos e contratos ficam guardados por 90 dias.</li>
              <li>Pode reativar quando quiser, pagando a mensalidade.</li>
            </ul>
            {state && !state.ok ? <Alert>{state.error}</Alert> : null}
            <Field label="Por que está cancelando? (opcional)" htmlFor="cancel_reason">
              <SelectMenu id="cancel_reason" name="reason" defaultValue="" options={[{ value: "", label: "Prefiro não dizer" }, ...REASONS.map((r) => ({ value: r, label: r }))]} />
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
