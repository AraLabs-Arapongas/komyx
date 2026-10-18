import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

/** A buffet with no activity for this long is flagged "parado". */
export const IDLE_DAYS = 14;

/** No activity in 14 days. Without any activity yet, counts from sign-up (`createdAt`). */
export function isIdle(at: string | null, createdAt?: string | null) {
  const ref = at ?? createdAt;
  return !ref || Date.now() - new Date(ref).getTime() > IDLE_DAYS * 86_400_000;
}

export function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

// Postgres and auth format timestamps differently; compare them as ISO strings.
const iso = (v: string) => new Date(v).toISOString();

function latest(...values: (string | null | undefined)[]) {
  return values.filter((v): v is string => Boolean(v)).map(iso).sort().at(-1) ?? null;
}

/** Last sign-in of each auth user (one page of up to 1000 users; enough for now). */
export async function lastSignIns(admin: Admin) {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  return new Map((data?.users ?? []).map((u) => [u.id, u.last_sign_in_at ?? null]));
}

/** Latest of events.updated_at, public_requests/payments.created_at and members' last sign-in, for one buffet. */
export async function orgLastActivity(admin: Admin, orgId: string, memberSignIns: (string | null)[]) {
  const [{ data: ev }, { data: req }, { data: pay }] = await Promise.all([
    admin.from("events").select("updated_at").eq("organization_id", orgId).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    admin.from("public_requests").select("created_at").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    admin.from("payments").select("created_at").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const sources = { evento: ev?.updated_at ?? null, pedido: req?.created_at ?? null, pagamento: pay?.created_at ?? null, login: latest(...memberSignIns) };
  return { at: latest(...Object.values(sources)), sources };
}

/**
 * Same idea for the whole list, kept cheap: only rows from the last 60 days are scanned (older activity
 * shows as "—"), plus everyone's last sign-in.
 */
export async function lastActivityByOrg(admin: Admin) {
  const since = daysAgoIso(60);
  const [{ data: ev }, { data: req }, { data: pay }, { data: members }, signIns] = await Promise.all([
    admin.from("events").select("organization_id, updated_at").gte("updated_at", since).order("updated_at", { ascending: false }).limit(1000),
    admin.from("public_requests").select("organization_id, created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(1000),
    admin.from("payments").select("organization_id, created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(1000),
    admin.from("profiles").select("id, organization_id"),
    lastSignIns(admin),
  ]);
  const out = new Map<string, string>();
  const bump = (org: string | null, at: string | null | undefined) => {
    if (!org || !at) return;
    const v = iso(at);
    if (!out.has(org) || out.get(org)! < v) out.set(org, v);
  };
  for (const r of ev ?? []) bump(r.organization_id, r.updated_at);
  for (const r of req ?? []) bump(r.organization_id, r.created_at);
  for (const r of pay ?? []) bump(r.organization_id, r.created_at);
  for (const m of members ?? []) bump(m.organization_id, signIns.get(m.id));
  return out;
}
