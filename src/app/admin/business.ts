import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import { toDateKey } from "@/lib/utils";
import { addDays, billingDataMissing, isPeriodMonths, periodPrice } from "@/lib/billing/plans";

type Admin = ReturnType<typeof createAdminClient>;

export type BusinessHealth = Awaited<ReturnType<typeof getBusinessHealth>>;

const TRIAL_DAYS = 30;
const monthKey = (d: string) => d.slice(0, 7);

/**
 * The Komyx business at a glance, from our own billing tables (they mirror Asaas through the webhook).
 * Demo buffets and the platform org are left out. "Paying" = active, out of the trial, with at least one
 * paid Komyx invoice. MRR counts 3/6/12-month plans at their monthly equivalent.
 */
export async function getBusinessHealth(admin: Admin) {
  const today = toDateKey(new Date());
  const thisMonth = monthKey(today);
  const lastMonth = monthKey(toDateKey(new Date(new Date(`${thisMonth}-15T12:00:00Z`).getTime() - 30 * 86_400_000)));
  const { data: orgRows } = await admin.from("organizations").select("id, name, status, created_at, cancelled_at, document, whatsapp").eq("is_demo", false).neq("kind", "platform");
  const orgs = orgRows ?? [];
  const ids = orgs.map((o) => o.id);
  const [{ data: bills }, { data: invs }] = ids.length
    ? await Promise.all([
      admin.from("organization_billing").select("organization_id, status, due_at, billing_period, monthly_price, paused_at").in("organization_id", ids),
      admin.from("billing_invoices").select("organization_id, amount, status, due_at, paid_at, period_start, period_end").in("organization_id", ids).neq("status", "void"),
    ])
    : [{ data: [] }, { data: [] }];
  const billBy = new Map((bills ?? []).map((b) => [b.organization_id, b]));
  const invoices = invs ?? [];
  const paidBy = new Map<string, string[]>(); // org → paid_at dates
  for (const i of invoices) if (i.status === "paid" && i.paid_at) paidBy.set(i.organization_id, [...(paidBy.get(i.organization_id) ?? []), i.paid_at]);
  const firstPaid = (id: string) => (paidBy.get(id) ?? []).sort()[0] ?? null;

  const monthly = (b: { billing_period: number; monthly_price: number | null } | undefined) => {
    const months = isPeriodMonths(b?.billing_period) ? b.billing_period : 1;
    return periodPrice(months, b?.monthly_price) / months;
  };
  const paying = orgs.filter((o) => o.status === "active" && billBy.get(o.id)?.status !== "trial" && paidBy.has(o.id));
  const mrr = paying.reduce((s, o) => s + monthly(billBy.get(o.id)), 0);

  // Money
  const sum = (xs: { amount: number | string }[]) => xs.reduce((s, x) => s + Number(x.amount), 0);
  const paid = invoices.filter((i) => i.status === "paid" && i.paid_at);
  const receivedThisMonth = sum(paid.filter((i) => monthKey(i.paid_at!) === thisMonth));
  const receivedLastMonth = sum(paid.filter((i) => monthKey(i.paid_at!) === lastMonth));
  const open = invoices.filter((i) => i.status === "open");
  const in30 = addDays(today, 30);
  const upcoming = open.filter((i) => i.due_at >= today && i.due_at <= in30);
  const late = open.filter((i) => i.due_at < today && orgs.find((o) => o.id === i.organization_id)?.status === "active");
  const lateOrgIds = [...new Set(late.map((i) => i.organization_id))];
  const pausedOrgIds = orgs.filter((o) => billBy.get(o.id)?.paused_at && o.status === "active").map((o) => o.id);

  // Customers
  const trials = orgs.filter((o) => o.status === "active" && billBy.get(o.id)?.status === "trial");
  const in7 = addDays(today, 7);
  const trialsEnding = trials.filter((o) => { const d = billBy.get(o.id)?.due_at; return d && d >= today && d <= in7; });
  const trialsEndingNoData = trialsEnding.filter((o) => billingDataMissing(o).length > 0);
  const newPaying = paying.filter((o) => { const f = firstPaid(o.id); return f && monthKey(f) === thisMonth; }).length;
  const churned = orgs.filter((o) => o.cancelled_at && monthKey(toDateKey(o.cancelled_at)) === thisMonth).length;
  const payingAtStart = Math.max(paying.length - newPaying + churned, 0);
  const churnRate = payingAtStart ? churned / payingAtStart : 0;
  // Trials that ended in the last 90 days (signup + 30 days) and whether they ever paid.
  const ended = orgs.filter((o) => { const end = addDays(toDateKey(o.created_at), TRIAL_DAYS); return end < today && end >= addDays(today, -90); });
  const converted = ended.filter((o) => paidBy.has(o.id)).length;

  // Last 12 months: money received and paying buffets at the end of each month.
  const series: { month: string; received: number; paying: number }[] = [];
  for (let k = 11; k >= 0; k--) {
    const ref = new Date(`${thisMonth}-15T12:00:00Z`);
    ref.setUTCMonth(ref.getUTCMonth() - k);
    const m = ref.toISOString().slice(0, 7);
    const end = k === 0 ? today : `${m}-28`;
    const payingThen = new Set(paid.filter((i) => i.period_start <= end && i.period_end > end).map((i) => i.organization_id)).size;
    series.push({ month: m, received: sum(paid.filter((i) => monthKey(i.paid_at!) === m)), paying: payingThen });
  }

  const name = (id: string) => orgs.find((o) => o.id === id)?.name ?? "—";
  return {
    mrr, arr: mrr * 12,
    receivedThisMonth, receivedLastMonth,
    upcoming: { total: sum(upcoming), count: upcoming.length },
    late: { total: sum(late), buffets: lateOrgIds.length, paused: pausedOrgIds.length },
    paying: paying.length, newPaying, churned, churnRate,
    trials: trials.length, trialsEnding: trialsEnding.length,
    conversion: { ended: ended.length, converted, rate: ended.length ? converted / ended.length : null },
    series,
    lateList: lateOrgIds.map((id) => ({ id, name: name(id), paused: pausedOrgIds.includes(id), oldest: late.filter((i) => i.organization_id === id).map((i) => i.due_at).sort()[0] })),
    trialsNoData: trialsEndingNoData.map((o) => ({ id: o.id, name: o.name, ends: billBy.get(o.id)?.due_at ?? null })),
  };
}
