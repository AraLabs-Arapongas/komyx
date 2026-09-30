"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { formatPhone, normalizePhone } from "@/lib/utils";

type Customer = { id: string; name: string; whatsapp: string };

export function CustomerPicker({ onSelect }: { onSelect: (c: Customer) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Customer[]>([]);

  useEffect(() => {
    const term = q.trim();
    let cancelled = false;
    const handle = setTimeout(async () => {
      if (term.length < 2) { if (!cancelled) setResults([]); return; }
      const supabase = createClient();
      const digits = normalizePhone(term);
      let query = supabase.from("customers").select("id, name, whatsapp").limit(6);
      query = digits.length >= 4 && digits.length === term.replace(/[\s()-]/g, "").length ? query.ilike("whatsapp", `%${digits}%`) : query.ilike("name", `%${term}%`);
      const { data } = await query;
      if (!cancelled) setResults(data ?? []);
    }, 250);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [q]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente existente por nome ou WhatsApp" className="pl-9" />
      </div>
      {results.length > 0 ? (
        <ul className="rounded-xl border border-border bg-surface divide-y divide-border overflow-hidden">
          {results.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => { onSelect(c); setQ(""); setResults([]); }} className="w-full text-left px-3 py-2.5 hover:bg-stone-50">
                <p className="font-medium">{c.name}</p>
                <p className="text-sm text-muted">{formatPhone(c.whatsapp)}</p>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
