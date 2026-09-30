import { cn } from "@/lib/utils";

type Tone = "amber" | "green" | "slate" | "red" | "zinc" | "brand";
const tones: Record<Tone, string> = {
  amber: "bg-amber-100 text-amber-800",
  green: "bg-emerald-100 text-emerald-800",
  slate: "bg-slate-200 text-slate-700",
  red: "bg-red-100 text-red-700",
  zinc: "bg-stone-200 text-stone-600",
  brand: "bg-brand-soft text-brand",
};

export function Badge({ tone = "zinc", className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", tones[tone], className)}>{children}</span>;
}
