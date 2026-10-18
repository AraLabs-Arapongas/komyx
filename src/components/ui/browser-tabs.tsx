import Link from "next/link";
import { cn } from "@/lib/utils";

export type BrowserTab = { key: string; label: string; href: string };

/**
 * Tabs in the style of browser tabs: the active one is a raised card joined to the panel below (use
 * BrowserTabPanel right after), the others sit flat on the strip with thin dividers between them.
 */
export function BrowserTabs({ tabs, active, label }: { tabs: BrowserTab[]; active: string; label: string }) {
  return (
    <nav aria-label={label} className="flex items-end overflow-x-auto px-2 -mb-px">
      {tabs.map((t, i) => {
        const on = t.key === active;
        const nextOn = tabs[i + 1]?.key === active;
        return (
          <Link key={t.key} href={t.href} scroll={false} aria-current={on ? "page" : undefined}
            className={cn(
              "relative shrink-0 whitespace-nowrap px-4 py-2.5 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 rounded-t-xl",
              on ? "z-10 border border-b-0 border-border bg-surface font-medium text-foreground" : "text-muted hover:bg-stone-200/50 hover:text-foreground",
            )}>
            {t.label}
            {/* Divider between two inactive tabs, as in a browser tab strip */}
            {!on && !nextOn && i < tabs.length - 1 ? <span aria-hidden className="absolute right-0 top-1/2 h-4 w-px -translate-y-1/2 bg-border" /> : null}
          </Link>
        );
      })}
    </nav>
  );
}

/** The panel the active tab is joined to. */
export function BrowserTabPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl rounded-tl-none border border-border bg-surface p-3 sm:p-4 space-y-4", className)}>{children}</div>;
}
