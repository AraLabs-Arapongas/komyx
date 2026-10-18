import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { runBillingDaily } from "@/lib/billing/subscription";

// Same shared secret as /api/notifications/email (Vault notify_email_secret = NOTIFY_EMAIL_SECRET).
const LOCAL_SECRET = "komyx-local-notify-email-secret";

function authorized(req: Request) {
  const secret = process.env.NOTIFY_EMAIL_SECRET || (process.env.NODE_ENV === "production" ? "" : LOCAL_SECRET);
  const a = Buffer.from(req.headers.get("authorization") ?? "");
  const b = Buffer.from(`Bearer ${secret}`);
  return Boolean(secret) && a.length === b.length && timingSafeEqual(a, b);
}

export const maxDuration = 60;

/**
 * Daily Komyx billing job, called by pg_cron (app.run_billing_daily, 08:00 Brasília). Lives under
 * /api/billing/asaas so the proxy's public prefix lets it through. See src/lib/billing/subscription.ts.
 */
export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const summary = await runBillingDaily(createAdminClient());
  if (summary.errors.length) console.error("[billing-daily]", summary.errors);
  return NextResponse.json({ ok: true, ...summary });
}
