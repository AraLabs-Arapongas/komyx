import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  organization_id: string;
  name: string;
  email: string;
  role: "owner" | "staff";
};

/**
 * Loads the authenticated user's profile once per request.
 * Redirects to /login when there is no session.
 */
export const requireProfile = cache(async (): Promise<Profile> => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, organization_id, name, email, role")
    .eq("id", userId)
    .maybeSingle();

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
  return data!;
});
