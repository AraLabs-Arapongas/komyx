import "server-only";
import { buildQuoteLines, sumLines, type PackagePricing } from "@/lib/pricing";
import { confirmEvent, type ConfirmCtx } from "@/lib/confirmation";

type Payload = { description?: string; price?: number; addon_id?: string; adults?: number; children?: number; amount?: number; txid?: string };

/** `price` overrides an extra's price, `amount` the payment actually received (owner app asks for both). */
export type Decision = { approve: boolean; reply: string | null; amount?: number; price?: number };

/** What approving a "mudar pessoas" request does to the quote: package + extra-people lines rebuilt. */
export function peopleQuoteDelta(pkg: PackagePricing | null, from: { adults: number; children: number }, to: { adults: number; children: number }) {
  const before = sumLines(buildQuoteLines(pkg, from.adults, from.children, []));
  const after = sumLines(buildQuoteLines(pkg, to.adults, to.children, []));
  return Math.round((after - before) * 100) / 100;
}

/**
 * The buffet answers a client request (site and owner app go through here). Approving applies it:
 * new head counts go onto the party and its latest quote (package and extra-people lines rebuilt,
 * so the total and the instalments follow), an extra goes into the party's extras, a payment notice
 * records the payment (which can confirm the party). Declining only records the answer.
 */
export async function decideRequest(ctx: ConfirmCtx, requestId: string, d: Decision) {
  const { supabase, userId } = ctx;
  const { data: r } = await supabase.from("event_change_requests").select("id, event_id, kind, message, payload, status, created_at").eq("id", requestId).maybeSingle();
  if (!r) throw new Error("Pedido não encontrado.");
  if (r.status !== "PENDING") throw new Error("Este pedido já foi respondido.");
  const p = (r.payload ?? {}) as Payload;

  if (d.approve && r.kind === "PEOPLE") {
    const { data: ev } = await supabase.from("events").select("id, adults, children").eq("id", r.event_id).single();
    if (!ev) throw new Error("Festa não encontrada.");
    const adults = typeof p.adults === "number" ? p.adults : ev.adults ?? 0;
    const children = typeof p.children === "number" ? p.children : ev.children ?? 0;
    const { error } = await supabase.from("events").update({ adults, children }).eq("id", r.event_id);
    if (error) throw error;
    const { data: quote } = await supabase.from("quotes")
      .select("id, organization_id, packages(id, name, base_price, included_adults, included_children, extra_adult_price, extra_child_price)")
      .eq("event_id", r.event_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (quote) {
      const { error: qErr } = await supabase.from("quotes").update({ adults, children }).eq("id", quote.id);
      if (qErr) throw qErr;
      await supabase.from("quote_items").delete().eq("quote_id", quote.id).in("kind", ["PACKAGE", "EXTRA_PARTICIPANTS"]);
      const lines = buildQuoteLines(quote.packages, adults, children, []);
      if (lines.length) {
        const { error: iErr } = await supabase.from("quote_items").insert(lines.map((l) => ({ ...l, organization_id: quote.organization_id, quote_id: quote.id })));
        if (iErr) throw iErr;
      }
    }
  } else if (d.approve && r.kind === "EXTRA") {
    const { error } = await supabase.from("event_extras").insert({
      organization_id: ctx.org.id, event_id: r.event_id, addon_id: p.addon_id ?? null, description: p.description ?? r.message ?? "Extra",
      quantity: 1, unit_price: d.price ?? Number(p.price ?? 0), source: "STAFF", created_by: userId,
    });
    if (error) throw error;
  } else if (d.approve && r.kind === "PAYMENT_NOTICE") {
    const amount = d.amount ?? Number(p.amount ?? 0);
    if (!(amount > 0)) throw new Error("Informe o valor recebido.");
    // Records the payment and closes every pending notice of the party (status APPROVED).
    await confirmEvent(ctx, r.event_id, { payment: { amount, method: "PIX", notes: `Pix avisado pelo cliente${p.txid ? ` · ${p.txid}` : ""}` } });
  }

  const { error: upErr } = await supabase.from("event_change_requests")
    .update({ status: d.approve ? "APPROVED" : "REJECTED", reply: d.reply, decided_at: new Date().toISOString(), decided_by: userId })
    .eq("id", r.id);
  if (upErr) throw upErr;

  // The notification is inserted by the request's trigger in the same transaction, so it shares created_at.
  await supabase.from("notifications").update({ read_at: new Date().toISOString() })
    .eq("type", "client_request").eq("href", `/eventos/${r.event_id}`).eq("created_at", r.created_at).is("read_at", null);

  return { eventId: r.event_id };
}
