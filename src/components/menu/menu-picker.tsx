"use client";

import { Check } from "lucide-react";
import { picksStatus, togglePick, type MenuGroup, type MenuPick } from "@/lib/menu";
import { cn } from "@/lib/utils";

/**
 * Picks items of a package's menu: one card per group. Groups with a choose_count show chips
 * ("Escolha 3 · faltam 2"); groups with no choice list what comes included.
 * `tone` "festa" follows the public page palette; default follows the app.
 */
export function MenuPicker({ groups, picks, onChange, tone = "app", compact }: { groups: MenuGroup[]; picks: MenuPick[]; onChange: (p: MenuPick[]) => void; tone?: "app" | "festa"; compact?: boolean }) {
  if (!groups.length) return null;
  const festa = tone === "festa";
  const { missing } = picksStatus(groups, picks);
  return (
    <div className="space-y-3">
      {groups.map((g) => {
        const chosen = picks.find((p) => p.group_id === g.id)?.item_ids ?? [];
        const remaining = g.choose_count != null ? g.choose_count - chosen.length : 0;
        return (
          <div key={g.id} className={cn("rounded-2xl border p-3", festa ? "bg-white/70 border-[#ece7dc]" : "bg-surface border-border")}>
            <div className="flex items-center justify-between gap-2">
              <p className={cn("font-semibold", festa && "display")}>{g.name}</p>
              {g.choose_count != null ? (
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", remaining > 0 ? (festa ? "bg-[var(--sun)] text-[var(--ink)]" : "bg-amber-100 text-amber-800") : (festa ? "bg-[var(--mint)] text-[var(--ink)]" : "bg-emerald-100 text-emerald-800"))}>
                  {remaining > 0 ? `Escolha ${g.choose_count} · ${remaining === g.choose_count ? "" : "faltam "}${remaining}` : `${g.choose_count} de ${g.choose_count} ✓`}
                </span>
              ) : <span className={cn("text-xs", festa ? "text-[var(--muted-ink)]" : "text-muted")}>Tudo incluído</span>}
            </div>
            <div className={cn("mt-2 flex flex-wrap gap-1.5", compact && "gap-1")}>
              {g.items.map((i) => {
                const on = g.choose_count == null || chosen.includes(i.id);
                const pickable = g.choose_count != null;
                return (
                  <button
                    type="button" key={i.id} disabled={!pickable} title={i.description ?? undefined}
                    onClick={() => onChange(togglePick(groups, picks, g.id, i.id))}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition",
                      on ? (festa ? "border-[var(--berry)] bg-[var(--berry)] text-white" : "border-brand bg-brand text-brand-fg") : (festa ? "border-[#ece7dc] bg-white text-[var(--ink)]" : "border-border bg-white"),
                      !pickable && "cursor-default opacity-90",
                      pickable && !on && remaining <= 0 && g.choose_count !== 1 && "opacity-50",
                    )}
                  >
                    {on ? <Check className="h-3.5 w-3.5" /> : null}{i.name}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {missing.length ? <p className={cn("text-xs", festa ? "text-[var(--muted-ink)]" : "text-muted")}>Dá para decidir depois: o que faltar fica marcado no orçamento.</p> : null}
    </div>
  );
}
