"use client";

import { useActionState } from "react";
import { changeEventStatus, extendPreReservation } from "@/lib/actions/events";
import { SubmitButton } from "@/components/ui/submit-button";

/** Inline Confirmar / Renovar / Cancelar for an expiring pre-reservation. */
export function PreReservationQuickActions({ eventId }: { eventId: string }) {
  const [state, action] = useActionState(changeEventStatus, undefined);
  const [extState, extendAction] = useActionState(extendPreReservation, undefined);
  const error = (state && !state.ok && state.error) || (extState && !extState.ok && extState.error);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <form action={action}><input type="hidden" name="id" value={eventId} /><input type="hidden" name="status" value="CONFIRMED" /><SubmitButton size="sm">Confirmar</SubmitButton></form>
      <form action={extendAction}><input type="hidden" name="id" value={eventId} /><SubmitButton size="sm" variant="outline">Renovar</SubmitButton></form>
      <form action={action}><input type="hidden" name="id" value={eventId} /><input type="hidden" name="status" value="CANCELLED" /><SubmitButton size="sm" variant="ghost" className="text-red-600">Cancelar</SubmitButton></form>
      {error ? <span className="text-xs text-red-600 basis-full">{error}</span> : null}
    </div>
  );
}
