"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Me = { name: string; email: string; admin: boolean; buffet: string | null; logo: string | null };

/**
 * Landing header: "Entrar" for visitors; for a signed-in person, an avatar (buffet logo, or "A" for
 * Komyx admins) with a small menu to the panel. Read in the browser so the landing page stays static.
 */
export function AccountButton() {
  // undefined = still checking: render a blank of the button's size, so "Entrar" never flashes before the avatar.
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    let alive = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { if (alive) setMe(null); return; }
      const { data } = await supabase.from("profiles").select("name, email, is_platform_admin, organizations(name, logo_url)").eq("id", session.user.id).maybeSingle();
      if (!alive) return;
      if (!data) { setMe(null); return; }
      const org = data.organizations as { name: string; logo_url: string | null } | null;
      setMe({ name: data.name, email: data.email, admin: data.is_platform_admin, buffet: org?.name ?? null, logo: org?.logo_url ?? null });
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  if (me === undefined) return <span aria-hidden className="inline-block h-10 w-24" />;
  if (!me) {
    return <Link href="/login" className="inline-flex h-10 items-center rounded-full px-4 text-sm font-bold ring-2 ring-inset ring-white/30 hover:bg-white/10">Entrar</Link>;
  }

  const label = me.admin ? "Admin Komyx" : (me.buffet ?? me.name);
  const initial = me.admin ? "A" : (me.buffet ?? me.name).trim().charAt(0).toUpperCase();
  const item = "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-stone-800 hover:bg-stone-100";
  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open} aria-label="Minha conta" className="group flex items-center gap-2.5 rounded-full py-1 pl-1 pr-1 sm:pl-4 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sun)]">
        <span data-testid="account-name" className="hidden max-w-[12rem] truncate text-sm font-bold sm:block">{label}</span>
        <span className="block h-10 w-10 shrink-0 overflow-hidden rounded-full ring-2 ring-white/40 group-hover:ring-white/70">
          {me.logo && !me.admin ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={me.logo} alt="" className="h-full w-full object-cover bg-white" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-base font-extrabold" style={{ background: me.admin ? "var(--sun)" : "var(--berry)", color: me.admin ? "var(--ink)" : "#fff" }}>{initial}</span>
          )}
        </span>
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 top-12 z-50 w-64 rounded-2xl bg-white p-2 text-left shadow-xl ring-1 ring-black/5">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-bold text-stone-900">{label}</p>
            <p className="truncate text-xs text-stone-500">{me.email}</p>
          </div>
          <div className="my-1 h-px bg-stone-100" />
          {/* One destination each: admins go to the Komyx admin, everyone else to their buffet's panel. */}
          {me.admin
            ? <Link role="menuitem" href="/admin" className={item}><ShieldCheck className="h-4 w-4" /> Abrir o admin</Link>
            : <Link role="menuitem" href="/home" className={item}><LayoutDashboard className="h-4 w-4" /> Abrir o painel</Link>}
          <form action="/auth/signout" method="post">
            <button role="menuitem" type="submit" className={`${item} w-full text-red-600`}><LogOut className="h-4 w-4" /> Sair</button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
