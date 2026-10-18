import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { toDateKey } from "@/lib/utils";

type Admin = ReturnType<typeof createAdminClient>;

const HOUR = 3_600_000;

export const CRON_LABELS: Record<string, string> = {
  "reset-demo-buffet": "Reset noturno das demos (03:30)",
  "expire-pre-reservations": "Libera reservas vencidas (a cada 5 min)",
};
// Jobs that must have started within this window, or they count as a problem.
const CRON_MAX_GAP_HOURS: Record<string, number> = { "reset-demo-buffet": 26 };

export type CronRow = {
  jobname: string;
  label: string;
  schedule: string;
  active: boolean;
  lastStart: string | null;
  lastStatus: string | null;
  lastMessage: string | null;
  failures7d: number;
  problem: string | null;
};

export async function getCronStatus(admin: Admin = createAdminClient()): Promise<CronRow[]> {
  const { data, error } = await admin.rpc("admin_cron_status");
  if (error) console.error("[admin-cron]", error.message);
  const now = Date.now();
  return (data ?? []).map((j) => {
    const gap = CRON_MAX_GAP_HOURS[j.jobname];
    let problem: string | null = null;
    if (!j.active) problem = "Desativado";
    else if (j.last_status === "failed") problem = "Última execução falhou";
    else if (gap && (!j.last_start || now - new Date(j.last_start).getTime() > gap * HOUR)) problem = j.last_start ? `Não rodou nas últimas ${gap}h` : "Nunca rodou";
    return {
      jobname: j.jobname,
      label: CRON_LABELS[j.jobname] ?? j.jobname,
      schedule: j.schedule,
      active: j.active,
      lastStart: j.last_start,
      lastStatus: j.last_status,
      lastMessage: j.last_message,
      failures7d: Number(j.failures_7d ?? 0),
      problem,
    };
  });
}

/** Ids of the real buffets: no demos, no platform org. */
export async function getRealOrgIds(admin: Admin = createAdminClient()) {
  const { data } = await admin.from("organizations").select("id").eq("is_demo", false).neq("kind", "platform");
  return (data ?? []).map((o) => o.id);
}

export type MessageCounts = Record<"email" | "sms", Record<"d1" | "d7", { sent: number; failed: number }>>;

export async function getMessageCounts(admin: Admin = createAdminClient()): Promise<MessageCounts> {
  const now = Date.now();
  const since = { d1: new Date(now - 24 * HOUR).toISOString(), d7: new Date(now - 7 * 24 * HOUR).toISOString() };
  const keys = (["email", "sms"] as const).flatMap((channel) =>
    (["d1", "d7"] as const).flatMap((range) => (["sent", "failed"] as const).map((status) => ({ channel, range, status }))),
  );
  const counts = await Promise.all(
    keys.map((k) =>
      admin.from("message_log").select("id", { count: "exact", head: true }).eq("channel", k.channel).eq("status", k.status).gte("created_at", since[k.range]),
    ),
  );
  const out: MessageCounts = {
    email: { d1: { sent: 0, failed: 0 }, d7: { sent: 0, failed: 0 } },
    sms: { d1: { sent: 0, failed: 0 }, d7: { sent: 0, failed: 0 } },
  };
  keys.forEach((k, i) => { out[k.channel][k.range][k.status] = counts[i].count ?? 0; });
  return out;
}

export async function getRecentFailures(admin: Admin = createAdminClient(), limit = 30) {
  const { data } = await admin
    .from("message_log")
    .select("id, created_at, channel, kind, to_address, error, organization_id")
    .eq("status", "failed")
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = data ?? [];
  const ids = [...new Set(rows.map((r) => r.organization_id).filter((id): id is string => Boolean(id)))];
  const { data: orgs } = ids.length ? await admin.from("organizations").select("id, name").in("id", ids) : { data: [] };
  const names = new Map((orgs ?? []).map((o) => [o.id, o.name]));
  return rows.map((r) => ({ ...r, orgName: r.organization_id ? (names.get(r.organization_id) ?? null) : null }));
}

/**
 * Notifications of real buffets from the last 7 days that still have no emailed_at 10 minutes after
 * being created: the e-mail webhook (pg_net → /api/notifications/email) did not run.
 */
export async function getStuckNotifications(admin: Admin, realOrgIds: string[], limit = 5) {
  if (!realOrgIds.length) return { count: 0, rows: [] };
  const { data, count } = await admin
    .from("notifications")
    .select("id, created_at, type, title, organizations(name)", { count: "exact" })
    .is("emailed_at", null)
    .lt("created_at", new Date(Date.now() - 10 * 60_000).toISOString())
    .gte("created_at", new Date(Date.now() - 7 * 24 * HOUR).toISOString())
    .in("organization_id", realOrgIds)
    .order("created_at", { ascending: false })
    .limit(limit);
  return { count: count ?? 0, rows: data ?? [] };
}

/** Open invoices of real buffets whose due date already passed. */
export async function getOverdueInvoices(admin: Admin, realOrgIds: string[]) {
  if (!realOrgIds.length) return 0;
  const { count } = await admin
    .from("billing_invoices")
    .select("id", { count: "exact", head: true })
    .eq("status", "open")
    .lt("due_at", toDateKey(new Date()))
    .in("organization_id", realOrgIds);
  return count ?? 0;
}

/** Only presence and the non-secret provider names; never the values. */
export function getConfigSanity() {
  const set = (name: string) => Boolean(process.env[name]);
  return {
    emailProvider: process.env.EMAIL_PROVIDER || "log",
    smsProvider: process.env.SMS_PROVIDER || "log",
    keys: [
      { name: "RESEND_API_KEY", set: set("RESEND_API_KEY"), hint: "e-mail pela Resend" },
      { name: "COMTELE_API_KEY", set: set("COMTELE_API_KEY"), hint: "SMS pela Comtele" },
      { name: "NOTIFY_EMAIL_SECRET", set: set("NOTIFY_EMAIL_SECRET"), hint: "webhook de e-mail das notificações" },
      { name: "SEND_EMAIL_HOOK_SECRET", set: set("SEND_EMAIL_HOOK_SECRET"), hint: "hook de e-mail do Supabase Auth" },
      { name: "SEND_SMS_HOOK_SECRET", set: set("SEND_SMS_HOOK_SECRET"), hint: "hook de SMS do Supabase Auth" },
    ],
  };
}
