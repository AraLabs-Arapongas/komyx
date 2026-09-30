import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { eventTitle } from "@/components/events/event-card";
import type { QuotePdfData, ContractPdfData } from "./documents";

type Client = SupabaseClient<Database>;

const ORG_COLS = "name, legal_name, document, address, whatsapp, pix_key";

/** Loads everything the quote PDF needs; works with the user client (RLS) or the admin client. */
export async function loadQuotePdfData(supabase: Client, quoteId: string): Promise<QuotePdfData | null> {
  const { data: q } = await supabase
    .from("quotes")
    .select(`id, status, subtotal, discount_total, total, notes, created_at, adults, children,
      quote_items(description, quantity, unit_price, total, sort_order),
      quote_installments(label, percent, amount, rule, days_before, due_date, sequence),
      events(title, starts_at, ends_at, customers(name, whatsapp)),
      organizations(${ORG_COLS})`)
    .eq("id", quoteId)
    .maybeSingle();
  if (!q || !q.events || !q.organizations || !q.events.customers) return null;
  return {
    org: q.organizations,
    customer: q.events.customers,
    event: { title: eventTitle(q.events), starts_at: q.events.starts_at, ends_at: q.events.ends_at, adults: q.adults, children: q.children },
    quote: {
      id: q.id, status: q.status, subtotal: q.subtotal, discount_total: q.discount_total, total: q.total, notes: q.notes, created_at: q.created_at,
      items: [...q.quote_items].sort((a, b) => a.sort_order - b.sort_order),
      installments: [...q.quote_installments].sort((a, b) => a.sequence - b.sequence),
    },
  };
}

export async function loadContractPdfData(supabase: Client, where: { id?: string; token?: string }): Promise<ContractPdfData | null> {
  let query = supabase.from("contracts").select(`number, content, status, accepted_at, accepted_name, created_at, organizations(${ORG_COLS})`);
  query = where.id ? query.eq("id", where.id) : query.eq("token", where.token!);
  const { data: c } = await query.maybeSingle();
  if (!c || !c.organizations) return null;
  return { org: c.organizations, number: c.number, content: c.content, status: c.status, accepted_at: c.accepted_at, accepted_name: c.accepted_name, created_at: c.created_at };
}
