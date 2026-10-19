import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type Profile = { id: string; organization_id: string; name: string; email: string; role: "owner" | "staff"; is_platform_admin: boolean };
export type Org = { id: string; name: string; slug: string; whatsapp: string | null; pix_key: string | null; pre_reservation_validity_hours: number; status: string; plan: string; default_event_duration_minutes: number; one_event_per_day: boolean; billing_due_at?: string | null; paused?: boolean; access_until?: string | null;
  /** Owner only (staff can't read billing): trial, the oldest late Komyx invoice, or up to date. */
  billing?: { trial: boolean; dueAt: string | null; lateSince: string | null } | null };

type AuthState = { session: Session | null; profile: Profile | null; org: Org | null; loading: boolean; refresh: () => Promise<void>; signOut: () => Promise<void> };

const AuthContext = createContext<AuthState>({ session: null, profile: null, org: null, loading: true, refresh: async () => {}, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [org, setOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(s: Session | null) {
    if (!s) { setProfile(null); setOrg(null); return; }
    const { data: p } = await supabase.from("profiles").select("id, organization_id, name, email, role, is_platform_admin").eq("id", s.user.id).maybeSingle();
    setProfile((p as Profile) ?? null);
    if (p) {
      // my_access_paused: day 10 of a late Komyx payment pauses the whole buffet (staff can't read billing).
      const [{ data: o }, { data: paused }] = await Promise.all([
        supabase.from("organizations").select("id, name, slug, whatsapp, pix_key, pre_reservation_validity_hours, status, plan, one_event_per_day, default_event_duration_minutes, access_until").eq("id", p.organization_id).maybeSingle(),
        supabase.rpc("my_access_paused"),
      ]);
      let billingDue: string | null = null;
      let billing: Org["billing"] = null;
      if (o && p.role === "owner") {
        const today = new Date().toISOString().slice(0, 10);
        const [{ data: b }, { data: late }] = await Promise.all([
          supabase.from("organization_billing").select("due_at, status").eq("organization_id", p.organization_id).maybeSingle(),
          supabase.from("billing_invoices").select("due_at").eq("status", "open").lt("due_at", today).order("due_at").limit(1).maybeSingle(),
        ]);
        billingDue = b?.due_at ?? null;
        billing = { trial: b?.status === "trial", dueAt: b?.due_at ?? null, lateSince: o.status === "cancelled" ? null : late?.due_at ?? null };
      }
      setOrg(o ? ({ ...(o as Org), billing_due_at: billingDue, paused: paused === true, billing } as Org) : null);
    }
  }

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      await load(data.session);
      if (mounted) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s);
      await load(s);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  return (
    <AuthContext.Provider value={{ session, profile, org, loading, refresh: () => load(session), signOut: async () => { await supabase.auth.signOut(); } }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

/** The admin set a temporary password (web: requireProfile → /nova-senha?obrigatoria=1): the person must create their own. */
export function mustChangePassword(session: Session | null) {
  return Boolean((session?.user.app_metadata as { must_change_password?: boolean } | undefined)?.must_change_password);
}
