import { Check } from "lucide-react";
import { menuSummaryLines, type MenuView } from "@/lib/menu";
import { cn } from "@/lib/utils";

/** The menu a quote includes, as compact lines per group. Server-safe. */
export function MenuSummary({ view, className, muted = "text-muted" }: { view: MenuView[]; className?: string; muted?: string }) {
  if (!view.length) return null;
  const lines = menuSummaryLines(view);
  return (
    <ul className={cn("space-y-1 text-sm", className)}>
      {lines.map((l) => (
        <li key={l.name} className="flex gap-2">
          <Check className={cn("mt-0.5 h-4 w-4 shrink-0", l.pending ? "text-amber-500" : "text-emerald-600")} />
          <span><span className="font-medium">{l.name}:</span> <span className={l.pending ? "text-amber-700" : muted}>{l.text}{l.pending ? " (a escolher)" : ""}</span></span>
        </li>
      ))}
    </ul>
  );
}
