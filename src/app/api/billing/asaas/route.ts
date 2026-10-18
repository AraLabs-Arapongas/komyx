import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyAsaasEvent } from "@/lib/billing/asaas-sync";
import type { AsaasPayment } from "@/lib/billing/asaas";
import type { Json } from "@/lib/database.types";

function authorized(req: Request) {
  const token = process.env.ASAAS_WEBHOOK_TOKEN ?? "";
  const a = Buffer.from(req.headers.get("asaas-access-token") ?? "");
  const b = Buffer.from(token);
  return Boolean(token) && a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Asaas webhook (Integrações › Webhooks, events of "Cobranças"). Each event is stored once by its id,
 * so Asaas' retries are no-ops. We answer 200 even when we skip or fail an event: a non-2xx makes Asaas
 * pause the whole queue. Failures stay in billing_webhook_events.error for /admin/saude.
 */
export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { id?: string; event?: string; payment?: AsaasPayment } | null;
  if (!body?.event) return NextResponse.json({ ok: true, skipped: "no event" });
  const admin = createAdminClient();
  const id = body.id ?? `${body.event}:${body.payment?.id ?? ""}:${body.payment?.status ?? ""}`;

  const { error: dup } = await admin.from("billing_webhook_events").insert({ id, provider: "asaas", event: body.event, payload: body as unknown as Json });
  if (dup) {
    // Already stored: process again only if the earlier attempt failed.
    const { data: prev } = await admin.from("billing_webhook_events").select("processed_at").eq("id", id).maybeSingle();
    if (prev?.processed_at) return NextResponse.json({ ok: true, skipped: "duplicate" });
  }
  try {
    const result = await applyAsaasEvent(admin, body.event, body.payment);
    await admin.from("billing_webhook_events").update({ processed_at: new Date().toISOString(), error: null }).eq("id", id);
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[asaas-webhook]", body.event, message);
    await admin.from("billing_webhook_events").update({ error: message.slice(0, 1000) }).eq("id", id);
    return NextResponse.json({ ok: true, error: "logged" });
  }
}
