"use client";

import { useActionState } from "react";
import { changeEventStatus, extendPreReservation } from "@/lib/actions/events";
import { Alert } from "@/components/ui/page";
import { SubmitButton } from "@/components/ui/submit-button";
import type { EventStatus } from "@/lib/labels";

export function StatusActions({ eventId, status }: { eventId: string; status: EventStatus }) {
  const [state, action] = useActionState(changeEventStatus, undefined);
  const [extState, extendAction] = useActionState(extendPreReservation, undefined);
  const error = (state && !state.ok && state.error) || (extState && !extState.ok && extState.error);

  return (
    <div className="space-y-2">
      {error ? <Alert>{error}</Alert> : null}
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
