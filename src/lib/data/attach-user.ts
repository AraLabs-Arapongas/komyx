import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * GoTrue's admin createUser inserts the row before app_metadata is written, so the
 * on_auth_user_created trigger sees no organization_id and creates a throwaway org.
 * This moves the profile to the intended org and removes that empty org.
 */
export async function attachUserToOrg(admin: SupabaseClient<Database>, userId: string, orgId: string, role: "owner" | "staff") {
  const { data: profile } = await admin.from("profiles").select("organization_id").eq("id", userId).maybeSingle();
  if (!profile) return;
  if (profile.organization_id === orgId) {
    await admin.from("profiles").update({ role }).eq("id", userId);
    return;
  }
  const stray = profile.organization_id;
  await admin.from("profiles").update({ organization_id: orgId, role }).eq("id", userId);
  const [{ count: members }, { count: events }] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("organization_id", stray),
    admin.from("events").select("id", { count: "exact", head: true }).eq("organization_id", stray),
  ]);
  if ((members ?? 0) === 0 && (events ?? 0) === 0) await admin.from("organizations").delete().eq("id", stray);
}
