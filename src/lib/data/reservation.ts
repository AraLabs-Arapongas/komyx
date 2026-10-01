import "server-only";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildPixPayload } from "@/lib/pix";

/** Everything the client-facing reservation page needs, loaded by RESERVATION token. */
export async function loadReservation(token: string) {
  if (token.length < 20) return null;
  const admin = createAdminClient();
  const { data: link } = await admin
    .from("public_links")
    .select("event_id, events(id, title, starts_at, ends_at, status, expires_at, adults, children, celebrant_name, pix_txid, customers(name, whatsapp), organizations(name, legal_name, city, slug, logo_url, whatsapp, pix_key, address, show_prices_public, pre_reservation_validity_hours))")
    .eq("token", token)
    .eq("type", "RESERVATION")
    .eq("active", true)
    .maybeSingle();
  if (!link?.events?.organizations) return null;
  const ev = link.events;
  const org = ev.organizations;
  const [{ data: quote }, { data: contract }, { data: quoteLink }, { data: payments }] = await Promise.all([
    admin.from("quotes").select("id, status, total, decided_at, quote_items(description, quantity, unit_price, total, sort_order), quote_installments(label, percent, amount, rule, days_before, due_date, sequence)").eq("event_id", ev.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    admin.from("contracts").select("token, status, number").eq("event_id", ev.id).in("status", ["SENT", "ACCEPTED"]).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    admin.from("public_links").select("token").eq("event_id", ev.id).eq("type", "QUOTE").eq("active", true).maybeSingle(),
    admin.from("payments").select("amount").eq("event_id", ev.id),
  ]);
  const installments = quote ? [...quote.quote_installments].sort((a, b) => a.sequence - b.sequence) : [];
  const deposit = installments[0] ? Number(installments[0].amount) : null;
  const paid = (payments ?? []).reduce((a, p) => a + Number(p.amount), 0);

  let pixPayload: string | null = null;
  let pixQr: string | null = null;
  const needsDeposit = ev.status === "PRE_RESERVED" && paid <= 0;
  if (org.pix_key && ev.pix_txid && needsDeposit) {
    pixPayload = buildPixPayload({ key: org.pix_key, merchantName: org.legal_name || org.name, merchantCity: (org.city || "SAO PAULO").split("/")[0], amount: deposit, txid: ev.pix_txid, description: `${ev.pix_txid} sinal festa` });
    try {
      const svg = await QRCode.toString(pixPayload, { type: "svg", margin: 1, width: 240, errorCorrectionLevel: "M" });
      pixQr = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    } catch { pixQr = null; }
  }
  return { event: ev, org, quote: quote ? { ...quote, items: [...quote.quote_items].sort((a, b) => a.sort_order - b.sort_order), installments } : null, contract, quoteToken: quoteLink?.token ?? null, deposit, paid, pixPayload, pixQr };
}
