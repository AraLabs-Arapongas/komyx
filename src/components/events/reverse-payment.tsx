"use client";

import { useState, useTransition } from "react";
import { Undo2 } from "lucide-react";
import { reversePayment } from "@/lib/actions/guests-payments";
import { formatCurrency } from "@/lib/utils";

/**
 * "Estornar" with a confirmation step. When this payment is what keeps a confirmed party
 * confirmed (nothing else paid), it also asks whether the party stays confirmed or goes back to
 * pre-reservation (contract hidden from the client again).
 */
export function ReversePaymentButton({ paymentId, eventId, amount, label = "Estornar", lastPaymentOfConfirmed, className }: { paymentId: string; eventId: string; amount: number; label?: string; lastPaymentOfConfirmed: boolean; className?: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reopen, setReopen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    start(async () => {
      const r = await reversePayment({ paymentId, eventId, reason, reopen });
      if (!r.ok) setError(r.error);
      else setOpen(false);
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className ?? "inline-flex items-center gap-1 text-xs text-muted hover:text-red-600"}>
        <Undo2 className="h-3.5 w-3.5" /> {label}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => !pending && setOpen(false)}>
          <div role="dialog" aria-modal="true" className="w-full max-w-sm space-y-4 rounded-2xl bg-surface p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-1">
              <p className="text-lg font-semibold">Estornar {formatCurrency(amount)}?</p>
              <p className="text-sm text-muted">O valor sai do que foi pago e a parcela volta a ficar em aberto. Fica registrado no histórico quem estornou e quando.</p>
            </div>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Motivo (opcional)</span>
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: Pix não caiu na conta" className="h-10 w-full rounded-xl border border-border bg-white px-3" />
            </label>
            {lastPaymentOfConfirmed ? (
              <fieldset className="space-y-2 text-sm">
                <legend className="font-medium">Este era o único pagamento da festa confirmada.</legend>
                <label className="flex items-start gap-2 rounded-xl border border-border p-2.5"><input type="radio" name="reopen" checked={!reopen} onChange={() => setReopen(false)} className="mt-1" /><span><span className="font-medium">Manter a festa confirmada</span><br /><span className="text-muted">O cliente vai pagar de outro jeito.</span></span></label>
                <label className="flex items-start gap-2 rounded-xl border border-border p-2.5"><input type="radio" name="reopen" checked={reopen} onChange={() => setReopen(true)} className="mt-1" /><span><span className="font-medium">Voltar para pré-reserva</span><br /><span className="text-muted">Data segura com novo prazo; o contrato sai da visão do cliente.</span></span></label>
              </fieldset>
            ) : null}
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <div className="flex gap-2">
              <button type="button" disabled={pending} onClick={() => setOpen(false)} className="h-10 flex-1 rounded-xl border border-border font-medium">Voltar</button>
              <button type="button" disabled={pending} onClick={submit} className="h-10 flex-1 rounded-xl bg-red-600 font-medium text-white disabled:opacity-60">{pending ? "Estornando..." : "Estornar"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
