import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { timed } from "@/lib/data/timing";

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
  const { data } = await supabase.from("organizations").select("*").eq("id", profile.organization_id).single();
  if (data?.status === "suspended" && !profile.is_platform_admin) redirect("/suspenso");
  if (data?.status === "cancelled" && !profile.is_platform_admin) {
    const today = new Date().toISOString().slice(0, 10);
    if (!data.access_until || data.access_until < today) redirect("/cancelada");
  }
  return data!;
});

/** Festeja staff only. */
export const requireAdmin = cache(async (): Promise<Profile> => {
  const profile = await requireProfile();
  if (!profile.is_platform_admin) redirect("/home?error=forbidden");
  return profile;
});

export type BillingRow = { cycle_start: string | null; due_at: string | null; status: string };

/** Billing cycle of the org. Only owners can read it (RLS); staff get null. */
export async function getBilling(profile: { organization_id: string; role: string }): Promise<BillingRow | null> {
  if (profile.role !== "owner") return null;
  const supabase = await createClient();
  const { data } = await supabase.from("organization_billing").select("cycle_start, due_at, status").eq("organization_id", profile.organization_id).maybeSingle();
  return data ?? null;
}
