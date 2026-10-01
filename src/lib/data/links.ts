import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export type LinkType = "RESERVATION" | "GUEST_CONFIRM" | "INVITE_EDIT" | "CHECKIN" | "QUOTE";
export type PublicLinkRow = { id: string; token: string; short: string; type: string };

/** Public links always exist for an event: creates the missing types and returns all active ones. */
export async function ensureEventLinks(supabase: SupabaseClient<Database>, orgId: string, eventId: string, types: LinkType[], createdBy?: string) {
  const { data: existing } = await supabase.from("public_links").select("id, token, short, type").eq("event_id", eventId).eq("active", true);
  const have = new Set((existing ?? []).map((l) => l.type));
  const missing = types.filter((t) => !have.has(t));
  if (missing.length === 0) return (existing ?? []) as PublicLinkRow[];
  const { data: created } = await supabase
    .from("public_links")
    .insert(missing.map((type) => ({ organization_id: orgId, event_id: eventId, type, created_by: createdBy ?? null })))
    .select("id, token, short, type");
  return [...(existing ?? []), ...(created ?? [])] as PublicLinkRow[];
}
