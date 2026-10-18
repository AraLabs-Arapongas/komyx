"use client";

import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectOption = { value: string; label: string };

const TONES = {
  // Owner app: brand colors. Public pages: the buffet's festive theme (CSS vars set on <main>).
  app: { accent: "var(--color-brand)", ring: "focus:ring-brand/40", hover: "hover:border-brand/50", active: "bg-brand-soft", font: "", ink: "var(--color-foreground)" },
  festa: { accent: "var(--berry)", ring: "focus:ring-[var(--berry)]/30", hover: "hover:border-[var(--berry)]/50", active: "bg-[var(--paper-2)]", font: "font-festa", ink: "var(--ink)" },
};

/**
 * Our select (the native one renders as the OS menu). Controlled (value + onChange) or uncontrolled
 * (defaultValue); `name` posts the value with the form. The list is portaled with fixed positioning
 * (cards clip their content) and opens upwards when there is no room below, counting a sticky bottom
 * bar. Keyboard: arrows, Enter, Esc, Home/End and type-ahead.
 */
export function SelectMenu({ id, name, value, defaultValue = "", onChange, options, placeholder = "Selecione", tone = "app", size = "md", className, "aria-label": ariaLabel, disabled }: {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  tone?: keyof typeof TONES;
  size?: "sm" | "md";
  className?: string;
  "aria-label"?: string;
  disabled?: boolean;
}) {
  const t = TONES[tone];
  const [inner, setInner] = useState(defaultValue);
  const current = value ?? inner;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  // Portal target: the page's <main> (not body) so the buffet's theme colors still apply.
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number; maxHeight: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const listId = useId();
  const selected = options.find((o) => o.value === current) ?? null;

  const choose = (v: string) => {
    if (value === undefined) setInner(v);
    onChange?.(v);
    setOpen(false);
  };

  // Places the fixed list next to the field: below it, or above when there is no room below.
  const place = () => {
    const r = rootRef.current?.getBoundingClientRect();
    if (!r) return false;
    // ~44px per option, at most 8 visible. The bottom 120px may be covered by a sticky bar.
    const want = Math.min(options.length, 8) * 44 + 12;
    const below = window.innerHeight - r.bottom - 120;
    const above = r.top - 16;
    const up = below < want && above > below;
    setPos(up
      ? { left: r.left, width: r.width, bottom: window.innerHeight - r.top + 8, maxHeight: Math.min(want, above) }
      : { left: r.left, width: r.width, top: r.bottom + 8, maxHeight: Math.max(160, Math.min(want, window.innerHeight - r.bottom - 24)) });
    return true;
  };

  const openList = () => {
    if (!place()) return;
    setHost(rootRef.current?.closest("main") ?? document.body);
    setActive(Math.max(0, options.findIndex((o) => o.value === current)));
    setOpen(true);
  };

  // The list is fixed: it follows the field while the page scrolls, and closes once the field is off screen.
  const follow = useEffectEvent((e: Event) => {
    if (e.target instanceof Node && listRef.current?.contains(e.target)) return;
    const r = rootRef.current?.getBoundingClientRect();
    if (!r || r.bottom < 0 || r.top > window.innerHeight) setOpen(false);
    else place();
  });

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!rootRef.current?.contains(t) && !listRef.current?.contains(t)) setOpen(false);
    };
    const onMove = (e: Event) => follow(e);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => { document.removeEventListener("pointerdown", onDown); window.removeEventListener("scroll", onMove, true); window.removeEventListener("resize", onMove); };
  }, [open]);

  useEffect(() => {
    // Scroll only the list (scrollIntoView could also scroll the page).
    const list = listRef.current;
    const item = list?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    if (open && list && item) {
      if (item.offsetTop < list.scrollTop) list.scrollTop = item.offsetTop;
      else if (item.offsetTop + item.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = item.offsetTop + item.offsetHeight - list.clientHeight;
    }
  }, [open, active]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); openList(); }
      return;
    }
    if (e.key === "Escape") { e.preventDefault(); setOpen(false); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(options.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (e.key === "Home") { e.preventDefault(); setActive(0); }
    else if (e.key === "End") { e.preventDefault(); setActive(options.length - 1); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (options[active]) choose(options[active].value); }
    else if (e.key === "Tab") setOpen(false);
    else if (e.key.length === 1) {
      const now = Date.now();
      typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : "") + e.key.toLowerCase(), at: now };
      const i = options.findIndex((o) => o.label.toLowerCase().startsWith(typed.current.text));
      if (i >= 0) setActive(i);
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {name ? <input type="hidden" name={name} value={current} /> : null}
      <button type="button" id={id} disabled={disabled} onClick={() => (open ? setOpen(false) : openList())} onKeyDown={onKeyDown}
        aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} aria-label={ariaLabel}
        className={cn("flex w-full items-center justify-between gap-2 border bg-surface text-left focus:outline-none focus:ring-2 transition-colors disabled:opacity-60",
          size === "sm" ? "h-8 rounded-lg px-2 text-xs" : "h-11 rounded-xl px-3.5", t.ring,
          open ? "" : cn("border-border", t.hover))} style={open ? { borderColor: t.accent } : undefined}>
        <span className={cn("truncate", selected ? "text-foreground" : "text-stone-400")}>{selected?.label ?? placeholder}</span>
        <ChevronDown className={cn("shrink-0 transition-transform", size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4", open && "rotate-180")} style={{ color: t.accent }} />
      </button>
      {open && pos && host ? createPortal(
        <ul ref={listRef} id={listId} role="listbox" aria-activedescendant={`${listId}-${active}`} tabIndex={-1}
          className={cn("fixed z-[60] overflow-auto rounded-2xl border bg-white p-1.5 shadow-[0_18px_50px_rgba(27,31,58,0.22)]", t.font)}
          style={{ borderColor: "#ece7dc", left: pos.left, width: Math.max(pos.width, 180), top: pos.top, bottom: pos.bottom, maxHeight: pos.maxHeight, color: t.ink }}>
          {options.map((o, i) => {
            const isSel = o.value === current;
            return (
              <li key={o.value} id={`${listId}-${i}`} data-index={i} role="option" aria-selected={isSel}
                onPointerEnter={() => setActive(i)} onClick={() => choose(o.value)}
                className={cn("flex cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2.5", tone === "festa" ? "text-[15px]" : "text-sm", i === active ? t.active : "", isSel && (tone === "festa" ? "font-bold" : "font-semibold"))}
                style={isSel ? { color: t.accent } : undefined}>
                <span>{o.label}</span>
                {isSel ? <Check className="h-4 w-4 shrink-0" /> : null}
              </li>
            );
          })}
        </ul>,
        host,
      ) : null}
    </div>
  );
}

/** Public pages: same select in the buffet's festive look. */
export function FestaSelect(props: Omit<Parameters<typeof SelectMenu>[0], "tone">) {
  return <SelectMenu {...props} tone="festa" />;
}
