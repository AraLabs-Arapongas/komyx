"use client";

import { useRef, useState } from "react";
import { setTodoPriority } from "@/lib/actions/admin-todos";
import { cn } from "@/lib/utils";

/**
 * Priority tag next to a to-do: "P1" (1 = most urgent) or "+ prioridade" when there is none.
 * Click to edit; saves on blur or Enter, Esc cancels. Empty clears it.
 */
export function PriorityInput({ id, priority }: { id: string; priority: number | null }) {
  const form = useRef<HTMLFormElement>(null);
  const [editing, setEditing] = useState(false);
  const initial = priority == null ? "" : String(priority);
  const tone = priority == null ? "" : priority <= 3 ? "bg-red-600 text-white" : priority <= 6 ? "bg-amber-400 text-stone-900" : "bg-stone-700 text-white";

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={priority == null ? "Definir prioridade" : `Prioridade ${priority}, alterar`}
        title="Prioridade (1 = mais urgente)"
        className={cn(
          "mt-0.5 h-6 shrink-0 rounded-full px-2 text-[11px] font-bold tabular-nums whitespace-nowrap",
          priority == null ? "border border-dashed border-stone-300 text-stone-400 hover:border-brand hover:text-brand" : tone,
        )}
      >
        {priority == null ? "+ prioridade" : `P${priority}`}
      </button>
    );
  }
  return (
    <form ref={form} action={setTodoPriority} className="shrink-0">
      <input type="hidden" name="id" value={id} />
      <input
        name="priority"
        autoFocus
        defaultValue={initial}
        inputMode="numeric"
        maxLength={2}
        aria-label="Prioridade"
        placeholder="1"
        onChange={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/\D/g, ""); }}
        onKeyDown={(e) => { if (e.key === "Escape") setEditing(false); }}
        onBlur={(e) => { if (e.currentTarget.value !== initial) form.current?.requestSubmit(); else setEditing(false); }}
        className="mt-0.5 h-6 w-12 rounded-full border border-brand bg-surface text-center text-xs font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-brand/40"
      />
    </form>
  );
}
