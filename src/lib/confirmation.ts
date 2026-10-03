import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { renderContract } from "@/lib/contract";
import { eventTitle } from "@/components/events/event-card";
import { loadQuoteMenu } from "@/lib/data/menu";
import { menuSummaryLines } from "@/lib/menu";

type DB = SupabaseClient<Database>;
type Org = Database["public"]["Tables"]["organizations"]["Row"];
export type ConfirmCtx = { supabase: DB; org: Org; userId: string };
export type PaymentInput = { amount: number; method?: "PIX" | "CASH" | "CARD" | "TRANSFER" | "OTHER"; paid_at?: string; notes?: string | null };

/**
 * Renders the org's contract template with the event and its latest quote and stores it.
 * `status` SENT makes it visible to the client (reservation page / app) right away.
 */
export async function insertContract(ctx: ConfirmCtx, eventId: string, status: "DRAFT" | "SENT" = "DRAFT") {
  const { supabase, org, userId } = ctx;
  const { data: event } = await supabase
    .from("events")
    .select("id, title, starts_at, ends_at, adults, children, celebrant_name, customers(name, document, whatsapp, email), packages(name)")
    .eq("id", eventId)
    .single();
  if (!event || !event.customers) throw new Error("Evento não encontrado.");
  const { data: quote } = await supabase
    .from("quotes")
    .select("id, package_id, total, quote_items(description, quantity, unit_price, total, sort_order), quote_installments(label, percent, amount, rule, days_before, due_date, sequence)")
    .eq("event_id", event.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const menu = quote ? menuSummaryLines(await loadQuoteMenu(supabase, quote.id, quote.package_id)) : [];
  const content = renderContract(org.contract_template, {
    menu,
    org,
    customer: event.customers,
    event: { title: eventTitle(event), starts_at: event.starts_at, ends_at: event.ends_at, adults: event.adults, children: event.children, celebrant_name: event.celebrant_name },
    packageName: event.packages?.name ?? null,
    items: [...(quote?.quote_items ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    total: quote?.total ?? 0,
    installments: [...(quote?.quote_installments ?? [])].sort((a, b) => a.sequence - b.sequence),
  });
  const { data, error } = await supabase
    .from("contracts")
    .insert({ organization_id: org.id, event_id: event.id, quote_id: quote?.id ?? null, content, status, sent_at: status === "SENT" ? new Date().toISOString() : null, created_by: userId })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Não foi possível gerar o contrato.");
  return data.id;
}

/**
 * The one way a party becomes confirmed, used by every button on the site and by the app:
 * optional payment → event CONFIRMED (when still a pre-reservation or quote, or when `confirm`)
 * → latest quote ACCEPTED → contract exists and is SENT to the client → public quote link
 * (PDF) exists → the client's pending "já paguei" notices are marked approved.
 *
 * With a payment on an event that is not pending confirmation, only the payment is recorded and
 * the notices are cleared. Returns what happened so callers can word their message.
 */
export async function confirmEvent(ctx: ConfirmCtx, eventId: string, opts: { payment?: PaymentInput; confirm?: boolean } = {}) {
  const { supabase, org, userId } = ctx;
  const { data: ev } = await supabase.from("events").select("id, status").eq("id", eventId).maybeSingle();
  if (!ev) throw new Error("Evento não encontrado.");
  if (ev.status === "CANCELLED") throw new Error("Este evento foi cancelado.");

  if (opts.payment) {
    const p = opts.payment;
    const { error } = await supabase.from("payments").insert({
      organization_id: org.id, event_id: eventId, amount: p.amount, method: p.method ?? "PIX",
      paid_at: p.paid_at ?? new Date().toISOString().slice(0, 10), notes: p.notes ?? null, created_by: userId,
    });
    if (error) throw error;
    await supabase.from("event_change_requests").update({ status: "APPROVED", decided_at: new Date().toISOString() }).eq("event_id", eventId).eq("kind", "PAYMENT_NOTICE").eq("status", "PENDING");
  }

  const shouldConfirm = opts.confirm || ev.status === "PRE_RESERVED" || (opts.payment && ev.status === "QUOTE");
  const wasConfirmed = ev.status === "CONFIRMED" || ev.status === "DONE";
  if (!shouldConfirm && !wasConfirmed) return { confirmed: false, contract: false };

  if (!wasConfirmed) {
    const { error } = await supabase.from("events").update({ status: "CONFIRMED", expires_at: null }).eq("id", eventId);
    if (error) throw error;
  }

  const { data: quote } = await supabase.from("quotes").select("id, status").eq("event_id", eventId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (quote && quote.status !== "ACCEPTED") {
    await supabase.from("quotes").update({ status: "ACCEPTED", decided_at: new Date().toISOString() }).eq("id", quote.id);
  }

  if (quote) {
    const { data: link } = await supabase.from("public_links").select("id, active").eq("event_id", eventId).eq("type", "QUOTE").limit(1).maybeSingle();
    if (!link) await supabase.from("public_links").insert({ organization_id: org.id, event_id: eventId, type: "QUOTE", created_by: userId });
    else if (!link.active) await supabase.from("public_links").update({ active: true }).eq("id", link.id);
  }

  let contract = false;
  const { data: existing } = await supabase.from("contracts").select("id, status").eq("event_id", eventId).neq("status", "CANCELLED").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!existing) {
    await insertContract(ctx, eventId, "SENT");
    contract = true;
  } else if (existing.status === "DRAFT") {
    await supabase.from("contracts").update({ status: "SENT", sent_at: new Date().toISOString() }).eq("id", existing.id);
    contract = true;
  }
  return { confirmed: !wasConfirmed, contract };
}
