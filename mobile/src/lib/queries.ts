import { supabase } from "./supabase";
import { toDateKey } from "./format";
import type { EventStatus } from "./labels";

export type EventRow = {
  id: string; title: string | null; starts_at: string; ends_at: string; status: EventStatus; expires_at: string | null;
  adults: number | null; children: number | null; estimated_participants: number | null; pix_txid: string | null; origin: string;
  customers: { name: string; whatsapp: string } | null;
};
export const EVENT_SELECT = "id, title, starts_at, ends_at, status, expires_at, adults, children, estimated_participants, pix_txid, origin, customers(name, whatsapp)";

export function eventTitle(e: { title: string | null; customers: { name: string } | null }) {
  return e.title?.trim() || (e.customers ? `Festa de ${e.customers.name}` : "Evento");
}

export type Financials = { event_id: string; quote_total: number; extras_total: number; total: number; paid_total: number; balance: number; payment_status: string; guest_count: number; adults_total: number; children_total: number; participants_total: number; checked_in_total: number };

export async function loadFinancials(ids: string[]) {
  const map = new Map<string, Financials>();
  if (!ids.length) return map;
  const { data } = await supabase.from("event_financials").select("*").in("event_id", ids);
  for (const f of data ?? []) map.set(f.event_id as string, f as Financials);
  return map;
}

/** Same data the web Home uses. */
export async function loadHome() {
  const now = new Date();
  const todayKey = toDateKey(now);
  const startOfToday = new Date(`${todayKey}T00:00:00-03:00`).toISOString();
  const endOfToday = new Date(`${todayKey}T23:59:59-03:00`).toISOString();
  const in7d = new Date(now.getTime() + 7 * 86_400_000).toISOString();
  const in48h = new Date(now.getTime() + 48 * 3_600_000).toISOString();
  const [todayRes, weekRes, expiringRes, onlineRes, requestsRes, owingRes] = await Promise.all([
    supabase.from("events").select(EVENT_SELECT).gte("starts_at", startOfToday).lte("starts_at", endOfToday).in("status", ["CONFIRMED", "PRE_RESERVED"]).order("starts_at"),
    supabase.from("events").select(EVENT_SELECT).gt("starts_at", endOfToday).lte("starts_at", in7d).in("status", ["CONFIRMED", "PRE_RESERVED"]).order("starts_at"),
    supabase.from("events").select(EVENT_SELECT).eq("status", "PRE_RESERVED").lte("expires_at", in48h).order("expires_at").limit(5),
    supabase.from("events").select(EVENT_SELECT).eq("origin", "SELF_SERVICE").eq("status", "PRE_RESERVED").order("created_at", { ascending: false }).limit(5),
    supabase.from("public_requests").select("id, name, whatsapp, desired_date, desired_time, adults, children, participants, message, created_at").eq("status", "NEW").order("created_at", { ascending: false }).limit(5),
    supabase.from("event_financials").select("event_id, balance").gt("balance", 0),
  ]);
  const today = (todayRes.data ?? []) as unknown as EventRow[];
  const week = (weekRes.data ?? []) as unknown as EventRow[];
  const online = (onlineRes.data ?? []) as unknown as EventRow[];
  const expiring = ((expiringRes.data ?? []) as unknown as EventRow[]).filter((e) => !online.some((o) => o.id === e.id));
  const fin = await loadFinancials([...today, ...week].map((e) => e.id));

  const owingIds = (owingRes.data ?? []).map((f) => f.event_id as string);
  const { data: owingEvents } = owingIds.length ? await supabase.from("events").select("id, starts_at, status").in("id", owingIds).in("status", ["CONFIRMED", "DONE"]) : { data: [] as { id: string; starts_at: string; status: string }[] };
  const balanceOf = new Map((owingRes.data ?? []).map((f) => [f.event_id as string, Number(f.balance)]));
  const nowIso = now.toISOString();
  const overdue = (owingEvents ?? []).filter((e) => e.starts_at < nowIso).reduce((a, e) => a + (balanceOf.get(e.id) ?? 0), 0);
  const dueWeek = (owingEvents ?? []).filter((e) => e.starts_at >= nowIso && e.starts_at <= in7d).reduce((a, e) => a + (balanceOf.get(e.id) ?? 0), 0);
  const total = (owingEvents ?? []).reduce((a, e) => a + (balanceOf.get(e.id) ?? 0), 0);

  return { today, week, expiring, online, requests: requestsRes.data ?? [], fin, receivables: { overdue, dueWeek, total } };
}

export async function unreadNotifications() {
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
  return count ?? 0;
}
