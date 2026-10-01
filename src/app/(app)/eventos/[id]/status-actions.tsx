"use client";

import { useActionState } from "react";
import { changeEventStatus, extendPreReservation, confirmDeposit } from "@/lib/actions/events";
import { Alert } from "@/components/ui/page";
import { SubmitButton } from "@/components/ui/submit-button";
import type { EventStatus } from "@/lib/labels";

export function StatusActions({ eventId, status, pixTxid, depositAmount }: { eventId: string; status: EventStatus; pixTxid?: string | null; depositAmount?: number | null }) {
  const [state, action] = useActionState(changeEventStatus, undefined);
  const [extState, extendAction] = useActionState(extendPreReservation, undefined);
  const [depState, depositAction] = useActionState(confirmDeposit, undefined);
  const error = (state && !state.ok && state.error) || (extState && !extState.ok && extState.error) || (depState && !depState.ok && depState.error);

  return (
    <div className="space-y-2">
      {error ? <Alert>{error}</Alert> : null}
      {depState?.ok && depState.message ? <Alert tone="success">{depState.message}</Alert> : null}
      {pixTxid && (status === "PRE_RESERVED" || status === "EXPIRED") ? (
        <form action={depositAction} className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm space-y-2">
          <input type="hidden" name="id" value={eventId} />
          <p><b>Reserva online.</b> Procure no extrato um Pix com identificador <code className="rounded bg-white px-1.5 py-0.5">{pixTxid}</code>{depositAmount ? <> de <b>R$ {depositAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</b></> : null}.</p>
          <div className="flex flex-wrap items-center gap-2">
            <input name="amount" inputMode="decimal" placeholder={depositAmount ? depositAmount.toFixed(2).replace(".", ",") : "valor"} className="h-9 w-32 rounded-lg border border-border bg-white px-2" aria-label="Valor recebido" />
            <SubmitButton size="sm" pendingText="Confirmando...">Sinal recebido · confirmar festa</SubmitButton>
          </div>
        </form>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {status === "PRE_RESERVED" ? (
          <>
            <form action={action}><input type="hidden" name="id" value={eventId} /><input type="hidden" name="status" value="CONFIRMED" /><SubmitButton size="sm">Confirmar evento</SubmitButton></form>
            <form action={extendAction}><input type="hidden" name="id" value={eventId} /><SubmitButton size="sm" variant="outline">Renovar prazo</SubmitButton></form>
            <form action={action}><input type="hidden" name="id" value={eventId} /><input type="hidden" name="status" value="CANCELLED" /><SubmitButton size="sm" variant="ghost" className="text-red-600">Cancelar</SubmitButton></form>
          </>
        ) : null}
        {status === "EXPIRED" ? (
          <>
            <form action={extendAction}><input type="hidden" name="id" value={eventId} /><SubmitButton size="sm">Renovar pré-reserva</SubmitButton></form>
            <form action={action}><input type="hidden" name="id" value={eventId} /><input type="hidden" name="status" value="CONFIRMED" /><SubmitButton size="sm" variant="outline">Confirmar evento</SubmitButton></form>
            <form action={action}><input type="hidden" name="id" value={eventId} /><input type="hidden" name="status" value="CANCELLED" /><SubmitButton size="sm" variant="ghost" className="text-red-600">Cancelar</SubmitButton></form>
          </>
        ) : null}
        {status === "CONFIRMED" ? (
          <>
            <form action={action}><input type="hidden" name="id" value={eventId} /><input type="hidden" name="status" value="DONE" /><SubmitButton size="sm">Marcar como realizado</SubmitButton></form>
            <form action={action}><input type="hidden" name="id" value={eventId} /><input type="hidden" name="status" value="PRE_RESERVED" /><SubmitButton size="sm" variant="outline">Voltar a pré-reserva</SubmitButton></form>
            <form action={action}><input type="hidden" name="id" value={eventId} /><input type="hidden" name="status" value="CANCELLED" /><SubmitButton size="sm" variant="ghost" className="text-red-600">Cancelar</SubmitButton></form>
          </>
        ) : null}
        {status === "DONE" ? (
          <form action={action}><input type="hidden" name="id" value={eventId} /><input type="hidden" name="status" value="CONFIRMED" /><SubmitButton size="sm" variant="outline">Reabrir como confirmado</SubmitButton></form>
        ) : null}
        {status === "CANCELLED" ? (
          <form action={action}><input type="hidden" name="id" value={eventId} /><input type="hidden" name="status" value="PRE_RESERVED" /><SubmitButton size="sm" variant="outline">Reabrir como pré-reserva</SubmitButton></form>
        ) : null}
      </div>
    </div>
  );
}
