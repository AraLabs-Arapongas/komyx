import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export type Financials = Database["public"]["Views"]["event_financials"]["Row"];

type Client = SupabaseClient<Database>;

/** Loads the financial summary view for a set of events, keyed by event id. */
export async function loadFinancials(supabase: Client, eventIds: string[]) {
  const map = new Map<string, Financials>();
  if (eventIds.length === 0) return map;
  const { data } = await supabase.from("event_financials").select("*").in("event_id", eventIds);
  for (const row of data ?? []) if (row.event_id) map.set(row.event_id, row);
  return map;
}

/** Attaches `event_financials` to each event row (the view has no FK, so PostgREST cannot embed it). */
export async function attachFinancials<T extends { id: string }>(supabase: Client, events: T[] | null | undefined) {
  const list = events ?? [];
  const map = await loadFinancials(supabase, list.map((e) => e.id));
  return list.map((e) => ({ ...e, event_financials: map.get(e.id) ?? null }));
}

export async function loadEventFinancials(supabase: Client, eventId: string) {
  const { data } = await supabase.from("event_financials").select("*").eq("event_id", eventId).maybeSingle();
  return data;
}
