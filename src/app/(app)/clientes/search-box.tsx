"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

/** Live search: updates ?q= as the owner types (debounced), resetting the page. */
export function SearchBox({ initial }: { initial: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [value, setValue] = useState(initial);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const t = setTimeout(() => {
      const params = new URLSearchParams(sp.toString());
      if (value.trim()) params.set("q", value.trim()); else params.delete("q");
      params.delete("page");
      router.replace(`${pathname}${params.toString() ? `?${params}` : ""}`);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to typing
  }, [value]);
  return (
    <label className="relative flex-1 min-w-0">
      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
      <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Buscar por nome ou WhatsApp" aria-label="Buscar cliente"
        className="h-11 w-full rounded-xl border border-border bg-surface pl-9 pr-3.5 text-sm" autoComplete="off" />
    </label>
  );
}
