"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Field, Input } from "@/components/ui/input";
import { formatPhone } from "@/lib/utils";

type Customer = { id: string; name: string; whatsapp: string };

/**
 * One field for the customer name. Typing searches existing customers (name or WhatsApp);
 * picking one fills the form, otherwise a new customer is created when the event is saved.
 */
export function CustomerField({ initialName, error, onPick, onChange }: { initialName: string; error?: string; onPick: (c: Customer) => void; onChange?: (value: string) => void }) {
  const [value, setValue] = useState(initialName);
  const [results, setResults] = useState<Customer[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const term = value.trim();
    let cancelled = false;
    const handle = setTimeout(async () => {
      if (term.length < 2) { if (!cancelled) setResults([]); return; }
      const supabase = createClient();
      const digits = term.replace(/\D/g, "");
      let query = supabase.from("customers").select("id, name, whatsapp").limit(6);
      query = digits.length >= 4 && digits.length === term.replace(/[\s()+-]/g, "").length ? query.ilike("whatsapp", `%${digits}%`) : query.ilike("name", `%${term}%`);
      const { data } = await query;
      if (!cancelled) setResults(data ?? []);
    }, 200);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [value]);

  return (
    <div className="relative">
      <Field label="Nome do responsável" htmlFor="customer_name" error={error} hint={results.length ? undefined : "Digite o nome ou o WhatsApp; clientes já cadastrados aparecem para escolher."}>
        <Input id="customer_name" name="customer_name" value={value} autoComplete="off" required
          onChange={(e) => { setValue(e.target.value); onChange?.(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)} />
      </Field>
      {open && results.length > 0 ? (
        <ul className="absolute z-20 mt-1 w-full rounded-xl border border-border bg-surface shadow-lg divide-y divide-border overflow-hidden" role="listbox">
          {results.map((c) => (
            <li key={c.id} role="option" aria-selected={false}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onPick(c); setOpen(false); }} className="w-full text-left px-3 py-2.5 hover:bg-stone-50">
                <p className="font-medium">{c.name}</p>
                <p className="text-sm text-muted">{formatPhone(c.whatsapp)} · cliente cadastrado</p>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
