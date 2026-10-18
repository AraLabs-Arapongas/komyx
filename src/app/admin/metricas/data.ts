import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/database.types";

export type FunnelRow = Database["public"]["Functions"]["admin_funnel"]["Returns"][number];

export const STALE_DAYS = 14;

/** "Parado": no activity in the last 14 days, or never any activity. */
export function isStale(row: Pick<FunnelRow, "last_activity_at" | "created_at">, now = Date.now()) {
  // A buffet with no activity yet counts from its sign-up: a new account is not "parado" on day one.
  const ref = row.last_activity_at ?? row.created_at;
  return now - new Date(ref).getTime() > STALE_DAYS * 86_400_000;
}

/** One row per real buffet (no demos, no platform org). */
export async function getFunnel(): Promise<FunnelRow[]> {
  const { data, error } = await createAdminClient().rpc("admin_funnel");
  if (error) console.error("[admin-funnel]", error.message);
  return data ?? [];
}
