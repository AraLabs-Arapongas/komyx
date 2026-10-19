import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { timed } from "@/lib/data/timing";
import { lateState } from "@/lib/billing/plans";
import { toDateKey } from "@/lib/utils";

export type Profile = {
  id: string;
  organization_id: string;
  name: string;
  email: string;
  role: "owner" | "staff";
  is_platform_admin: boolean;
};

/**
 * Loads the authenticated user's profile once per request.
 * Redirects to /login when there is no session.
 */
export const requireProfile = cache(async (): Promise<Profile> => {
  const supabase = await createClient();
  const { data: claims } = await timed("auth.getClaims", supabase.auth.getClaims());
  const userId = claims?.claims.sub;
  if (!userId) redirect("/login");
  // A temporary password set by the admin: the person creates their own before using the app.
  if ((claims?.claims.app_metadata as { must_change_password?: boolean } | undefined)?.must_change_password) redirect("/nova-senha?obrigatoria=1");

  const { data: profile } = await timed(
    "profiles.select",
    supabase.from("profiles").select("id, organization_id, name, email, role, is_platform_admin").eq("id", userId).maybeSingle(),
  );

  if (!profile) {
    await supabase.auth.signOut();
    redirect("/login?error=profile");
  }
  return profile;
});

export const requireOwner = cache(async (): Promise<Profile> => {
  const profile = await requireProfile();
  if (profile.role !== "owner") redirect("/home?error=forbidden");
  return profile;
});

export const getOrganization = cache(async () => {
  const profile = await requireProfile();
  const supabase = await createClient();
  const [{ data }, paused] = await Promise.all([
    supabase.from("organizations").select("*").eq("id", profile.organization_id).single(),
    isAccessPaused(profile.organization_id),
  ]);
  if (data?.status === "suspended" && !profile.is_platform_admin) redirect("/suspenso");
  if (data?.status === "cancelled" && !profile.is_platform_admin) {
    const today = new Date().toISOString().slice(0, 10);
    if (!data.access_until || data.access_until < today) redirect("/cancelada");
  }
  // Day 10 of a late Komyx payment (docs/assinatura.md §4): the whole app becomes the paused screen.
  if (paused && data?.status === "active" && !profile.is_platform_admin) redirect("/pausado");
  return data!;
});

/**
 * "Acesso pausado" by the billing job (organization_billing.paused_at). Read with the service role:
 * staff cannot read organization_billing under RLS, but the pause applies to the whole buffet.
 */
export const isAccessPaused = cache(async (orgId: string) => {
  const { data } = await createAdminClient().from("organization_billing").select("paused_at").eq("organization_id", orgId).maybeSingle();
  return Boolean(data?.paused_at);
});

/** Komyx staff only. */
export const requireAdmin = cache(async (): Promise<Profile> => {
  const profile = await requireProfile();
  if (!profile.is_platform_admin) redirect("/home?error=forbidden");
  return profile;
});

export type BillingRow = {
  cycle_start: string | null; due_at: string | null; status: string;
  billing_period: number; pending_period: number | null; pending_from: string | null; paused_at: string | null;
  monthly_price: number | null; auto_billing: boolean; provider_subscription_id: string | null;
};

/** Billing cycle and plan of the org. Only owners can read it (RLS); staff get null. */
export const getBilling = cache(async (profile: { organization_id: string; role: string }): Promise<BillingRow | null> => {
  if (profile.role !== "owner") return null;
  const supabase = await createClient();
  const { data } = await supabase.from("organization_billing").select("cycle_start, due_at, status, billing_period, pending_period, pending_from, paused_at, monthly_price, auto_billing, provider_subscription_id").eq("organization_id", profile.organization_id).maybeSingle();
  return data ?? null;
});

/** Open Komyx invoices and how late the buffet is (lateState). Owners only; null for staff or no billing. */
export const getLateBilling = cache(async (profile: { organization_id: string; role: string }) => {
  const bill = await getBilling(profile);
  if (!bill) return null;
  const supabase = await createClient();
  const { data: open } = await supabase.from("billing_invoices").select("id, due_at, status, payment_url, amount, provider, external_id").eq("status", "open").order("due_at");
  return { bill, open: open ?? [], late: lateState(bill, open ?? [], toDateKey(new Date())) };
});
