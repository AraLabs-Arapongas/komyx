"use client";

import { useRef } from "react";
import { setTodoPriority } from "@/lib/actions/admin-todos";

/** Small number box next to a to-do: 1 = most urgent, empty = no priority. Saves on blur or Enter. */
export function PriorityInput({ id, priority }: { id: string; priority: number | null }) {
  const form = useRef<HTMLFormElement>(null);
  const initial = priority == null ? "" : String(priority);
  return (
    <form ref={form} action={setTodoPriority}>
      <input type="hidden" name="id" value={id} />
      <input
        name="priority"
        defaultValue={initial}
        inputMode="numeric"
        maxLength={2}
        placeholder="–"
        aria-label="Prioridade"
        title="Prioridade (1 = mais urgente)"
        onChange={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/\D/g, ""); }}
        onBlur={(e) => { if (e.currentTarget.value !== initial) form.current?.requestSubmit(); }}
        className="h-7 w-9 rounded-lg border border-border bg-surface text-center text-xs font-semibold tabular-nums text-foreground placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-brand/40"
      />
    </form>
  );
}
