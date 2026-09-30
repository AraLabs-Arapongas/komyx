import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageBody, PageHeader, EmptyState } from "@/components/ui/page";
import { buttonClass } from "@/components/ui/button";
import { EventCard, type EventListItem } from "@/components/events/event-card";
import { attachFinancials } from "@/lib/data/financials";
import { cn } from "@/lib/utils";

export const metadata = { title: "Eventos" };

const FILTERS = [
  { key: "upcoming", label: "Próximos" },
  { key: "PRE_RESERVED", label: "Pré-reservas" },
  { key: "CONFIRMED", label: "Confirmados" },
  { key: "DONE", label: "Realizados" },
  { key: "CANCELLED", label: "Cancelados" },
  { key: "EXPIRED", label: "Expiradas" },
] as const;

export default async function EventsPage({ searchParams }: PageProps<"/eventos">) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "upcoming";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const supabase = await createClient();

  let query = supabase
    .from("events")
    .select("id, title, starts_at, ends_at, status, expires_at, estimated_participants, customers!inner(name, whatsapp)")
    .order("starts_at", { ascending: status !== "DONE" && status !== "CANCELLED" && status !== "EXPIRED" });

  if (status === "upcoming") {
    query = query.in("status", ["CONFIRMED", "PRE_RESERVED"]).gte("ends_at", new Date().toISOString());
  } else {
    query = query.eq("status", status as EventListItem["status"]);
  }
  if (q) query = query.or(`title.ilike.%${q}%,name.ilike.%${q}%`, { referencedTable: "customers" });

  const { data: rows } = await query.limit(100);
  const events = await attachFinancials(supabase, rows);

  return (
    <>
      <PageHeader title="Eventos" action={<Link href="/eventos/novo" className={buttonClass("primary", "sm")}><Plus className="h-4 w-4" /> Novo</Link>} />
      <PageBody>
        <form className="flex gap-2">
          <input type="hidden" name="status" value={status} />
          <input name="q" defaultValue={q} placeholder="Buscar por título ou cliente" className="h-11 flex-1 rounded-xl border border-border bg-surface px-3.5" />
          <button className={buttonClass("outline", "md")}>Buscar</button>
        </form>
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
          {FILTERS.map((f) => (
            <Link key={f.key} href={`/eventos?status=${f.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={cn("whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium border", status === f.key ? "bg-brand text-brand-fg border-brand" : "bg-surface border-border text-muted")}>
              {f.label}
            </Link>
          ))}
        </div>
        {events.length > 0 ? (
          <div className="space-y-2">{events.map((e) => <EventCard key={e.id} event={e as unknown as EventListItem} />)}</div>
        ) : (
          <EmptyState title="Nenhum evento encontrado" description="Ajuste o filtro ou crie uma nova pré-reserva." action={<Link href="/eventos/novo" className={buttonClass("primary", "sm")}>Nova pré-reserva</Link>} />
        )}
      </PageBody>
    </>
  );
}
