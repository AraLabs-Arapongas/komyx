"use client";

import { useActionState, useState } from "react";
import { CalendarPlus, Minus, PartyPopper, Plus } from "lucide-react";
import { confirmGuest } from "@/lib/actions/public";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/page";

/** − n + counter; the value travels in a hidden input so the Server Action form stays plain. */
function Stepper({ name, label, hint, value, onChange, min = 0, max = 30 }: { name: string; label: string; hint: string; value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  const btn = "h-11 w-11 shrink-0 grid place-items-center rounded-full border border-border bg-surface text-[var(--ink)] disabled:opacity-30 active:scale-95 transition";
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-[var(--paper)] px-4 py-3">
      <div>
        <p className="font-bold leading-tight">{label}</p>
        <p className="text-xs text-muted">{hint}</p>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" aria-label={`Menos ${label.toLowerCase()}`} className={btn} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}><Minus className="h-5 w-5" /></button>
        <span className="w-7 text-center text-2xl font-black tabular-nums" aria-live="polite">{value}</span>
        <button type="button" aria-label={`Mais ${label.toLowerCase()}`} className={btn} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}><Plus className="h-5 w-5" /></button>
      </div>
      <input type="hidden" name={name} value={value} />
    </div>
  );
}

export function GuestForm({ token, mapsUrl }: { token: string; mapsUrl: string | null }) {
  const [state, action] = useActionState(confirmGuest, undefined);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};

  if (state?.ok) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto h-16 w-16 rounded-full bg-[var(--mint)] grid place-items-center text-[var(--ink)]"><PartyPopper className="h-8 w-8" /></div>
        <div>
          <p className="display text-2xl font-black">Presença confirmada!</p>
          <p className="text-sm text-muted">Obrigado. Nos vemos na festa.</p>
        </div>
        <a href={`/g/${token}/evento.ics`} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--ink)] text-white font-bold"><CalendarPlus className="h-5 w-5" /> Salvar no calendário</a>
        {mapsUrl ? <a href={mapsUrl} target="_blank" rel="noopener" className="inline-flex h-12 w-full items-center justify-center rounded-full border border-border bg-surface font-bold">Como chegar</a> : null}
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <div>
        <p className="display text-2xl font-black">Você vai?</p>
        <p className="text-sm text-muted">Confirme para o anfitrião saber quantos esperar.</p>
      </div>
      {state && !state.ok ? <Alert>{state.error}</Alert> : null}
      <input type="hidden" name="token" value={token} />
      <Field label="Seu nome ou da família" htmlFor="g_name" error={fe.name}><Input id="g_name" name="name" autoComplete="name" placeholder="Ex.: Família Souza" required className="h-12 rounded-2xl text-base" /></Field>
      <div className="space-y-2">
        <Stepper name="adults" label="Adultos" hint="13 anos ou mais" value={adults} onChange={setAdults} />
        <Stepper name="children" label="Crianças" hint="até 12 anos" value={children} onChange={setChildren} />
        {fe.adults || fe.children ? <p className="text-xs text-red-600">{fe.adults ?? fe.children}</p> : null}
      </div>
      <Field label="Alguma observação?" htmlFor="g_notes" hint="Restrição alimentar, bebê de colo, cadeirante…"><Input id="g_notes" name="notes" placeholder="Opcional" className="h-12 rounded-2xl text-base" /></Field>
      <SubmitButton size="lg" className="w-full h-14 rounded-full text-lg font-black" pendingText="Confirmando..." disabled={adults + children === 0}>
        Confirmar {adults + children} {adults + children === 1 ? "pessoa" : "pessoas"}
      </SubmitButton>
    </form>
  );
}
