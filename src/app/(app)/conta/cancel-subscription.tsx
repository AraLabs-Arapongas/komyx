"use client";

import { useActionState, useState } from "react";
import { cancelSubscription } from "@/lib/actions/subscription";
import { buttonClass } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";
import { SelectMenu } from "@/components/ui/select-menu";
import { cn } from "@/lib/utils";

const REASONS = ["Vou parar com o buffet", "Está caro", "Faltam recursos", "Uso outro sistema", "Outro motivo"];

export type CancelChoice = { key: "keep" | "full_7_days" | "prorata"; title: string; description: string };

/**
 * Cancel with a confirmation dialog: the refund choices of docs/assinatura.md §5 (computed on the server),
 * reason, what happens next, and typing CANCELAR.
 */
export function CancelSubscription({ choices, summary }: { choices: CancelChoice[]; summary: string | null }) {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<CancelChoice["key"]>(choices[0]?.key ?? "keep");
  const [state, action] = useActionState(cancelSubscription, undefined);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  if (state?.ok) return <Alert tone="success">{state.message}</Alert>;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass("ghost", "sm", "text-red-600")}>Cancelar assinatura</button>
      {open ? (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <form action={action} role="dialog" aria-label="Cancelar assinatura" className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-surface border border-border p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div>
              <p className="font-semibold text-lg">Cancelar a assinatura do Komyx?</p>
              {summary ? <p className="mt-2 text-sm" data-testid="cancel-summary">{summary}</p> : null}
            </div>
            {choices.length > 1 ? (
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium mb-1">Como prefere?</legend>
                {choices.map((c) => (
                  <label key={c.key} className={cn("flex items-start gap-2 rounded-xl border p-3 text-sm cursor-pointer", choice === c.key ? "border-brand bg-brand-soft/40" : "border-border")}>
                    <input type="radio" name="option" value={c.key} checked={choice === c.key} onChange={() => setChoice(c.key)} className="mt-0.5 accent-[var(--brand)]" />
                    <span><span className="font-medium block">{c.title}</span><span className="text-muted">{c.description}</span></span>
                  </label>
                ))}
              </fieldset>
            ) : (
              <>
                <input type="hidden" name="option" value={choices[0]?.key ?? "keep"} />
                {choices[0] ? <p className="text-sm text-muted">{choices[0].description}</p> : null}
              </>
            )}
            <ul className="text-sm text-muted list-disc pl-5 space-y-1">
              <li>Sua página pública sai do ar na hora.</li>
              <li>Agenda, clientes, orçamentos e contratos ficam guardados por 90 dias.</li>
              <li>Pode reativar quando quiser, com tudo no lugar.</li>
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
