"use client";

import { useActionState } from "react";
import { findReservation } from "@/lib/actions/public";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";

/** Lost the link? WhatsApp + party date acts as the lookup key. */
export function FindReservation({ slug }: { slug: string }) {
  const [state, action] = useActionState(findReservation, undefined);
  return (
    <details className="rounded-2xl p-4 text-sm" style={{ background: "rgba(255,255,255,0.06)" }}>
      <summary className="font-bold cursor-pointer" style={{ color: "#fff" }}>Já reservou? Encontre sua reserva</summary>
      <form action={action} className="mt-3 space-y-3">
        {state && !state.ok ? <Alert>{state.error}</Alert> : null}
        <input type="hidden" name="slug" value={slug} />
        <div className="grid grid-cols-2 gap-2">
          <Field label="WhatsApp" htmlFor="find_wa"><Input id="find_wa" name="whatsapp" type="tel" inputMode="tel" required /></Field>
          <Field label="Data da festa" htmlFor="find_date"><Input id="find_date" name="date" type="date" required /></Field>
        </div>
        <SubmitButton size="sm" pendingText="Buscando...">Abrir minha reserva</SubmitButton>
      </form>
    </details>
  );
}
