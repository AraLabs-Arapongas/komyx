import Link from "next/link";
import { Plus, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageBody, PageHeader, EmptyState } from "@/components/ui/page";
import { buttonClass } from "@/components/ui/button";
import { cn, formatPhone } from "@/lib/utils";
import { SearchBox } from "./search-box";

export const metadata = { title: "Clientes" };

type RefEvent = { id: string; title: string | null; starts_at: string; status: string; future: boolean } | null;
type Row = { id: string; name: string; whatsapp: string; email: string | null; source: string | null; events_count: number; next_event: RefEvent; last_event: RefEvent; ref_event: RefEvent };
type Result = { total: number; page: number; size: number; rows: Row[] };

const SORTS = ["name", "whatsapp", "event", "events"] as const;
type Sort = (typeof SORTS)[number];
const PAGE_SIZE = 25;

function shortDate(iso: string) {
  const parts = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "short" }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((x) => x.type === t)?.value ?? "";
  return `${get("day")}/${get("month").replace(".", "")}`;
}

function eventLabel(r: Row) {
  const e = r.ref_event;
  if (!e) return null;
  return { text: `${shortDate(e.starts_at)} · ${e.title?.trim() || `Festa de ${r.name.split(" ")[0]}`}`, future: e.future, id: e.id };
}

export default async function CustomersPage({ searchParams }: PageProps<"/clientes">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const sort: Sort = SORTS.includes(sp.sort as Sort) ? (sp.sort as Sort) : "name";
  const dir: "asc" | "desc" = sp.dir === "desc" ? "desc" : "asc";
  const supabase = await createClient();
  const { data } = await supabase.rpc("search_customers", { p_q: q, p_page: page, p_size: PAGE_SIZE, p_sort: sort, p_dir: dir });
  const result = (data ?? { total: 0, page, size: PAGE_SIZE, rows: [] }) as unknown as Result;
  const pages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const from = result.total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, result.total);

  const href = (over: { page?: number; sort?: Sort; dir?: "asc" | "desc" }) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    const s = over.sort ?? sort, d = over.dir ?? dir, pg = over.page ?? page;
    if (s !== "name") p.set("sort", s);
    if (d !== "asc") p.set("dir", d);
    if (pg > 1) p.set("page", String(pg));
    const qs = p.toString();
    return `/clientes${qs ? `?${qs}` : ""}`;
  };
  return (
    <>
      <PageHeader title="Clientes" action={<Link href="/clientes/novo" className={buttonClass("primary", "sm")}><Plus className="h-4 w-4" /> Novo</Link>} />
      <PageBody>
        <div className="flex items-center gap-3">
          <SearchBox initial={q} />
          <p className="text-sm text-muted whitespace-nowrap">{result.total.toLocaleString("pt-BR")} cliente{result.total === 1 ? "" : "s"}</p>
        </div>

        {result.rows.length === 0 ? (
          <EmptyState title="Nenhum cliente" description={q ? "Nada encontrado para essa busca." : "Clientes são criados automaticamente no orçamento ou aqui."} action={q ? null : <Link href="/clientes/novo" className={buttonClass("primary", "sm")}>Novo cliente</Link>} />
        ) : (
          <>
            {/* Desktop: table. Rows are links (whole row clickable). */}
            <div className="hidden md:block rounded-2xl border border-border bg-surface overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 border-b border-border">
                  <tr>
                    <Th k="name" label="Cliente" sort={sort} dir={dir} href={href} />
                    <Th k="whatsapp" label="WhatsApp" sort={sort} dir={dir} href={href} />
                    <Th k="event" label="Próximo/último evento" sort={sort} dir={dir} href={href} />
                    <Th k="events" label="Eventos" className="text-right" sort={sort} dir={dir} href={href} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {result.rows.map((r) => {
                    const ev = eventLabel(r);
                    return (
                      <tr key={r.id} className="relative hover:bg-stone-50 cursor-pointer">
                        <td className="px-4 py-3 font-medium">
                          <Link href={`/clientes/${r.id}`} className="after:absolute after:inset-0">{r.name}</Link>
                        </td>
                        <td className="px-4 py-3 text-muted tabular-nums">{formatPhone(r.whatsapp)}</td>
                        <td className="px-4 py-3">
                          {ev ? <span className={cn(ev.future ? "text-foreground" : "text-muted")}>{ev.text}{!ev.future ? <span className="text-xs text-muted"> · realizado</span> : null}</span> : <span className="text-muted">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{r.events_count}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <Pager page={page} pages={pages} from={from} to={to} total={result.total} href={href} />
            </div>

            {/* Mobile: compact cards. */}
            <div className="md:hidden rounded-2xl border border-border bg-surface divide-y divide-border overflow-hidden">
              {result.rows.map((r) => {
                const ev = eventLabel(r);
                return (
                  <Link key={r.id} href={`/clientes/${r.id}`} className="block px-4 py-3 hover:bg-stone-50">
                    <p className="font-medium truncate">{r.name}</p>
                    <p className="text-sm text-muted">{formatPhone(r.whatsapp)} · {r.events_count} evento{r.events_count === 1 ? "" : "s"}</p>
                    {ev ? <p className="text-sm text-muted truncate">{ev.future ? "Próximo" : "Último"}: {ev.text}</p> : null}
                  </Link>
                );
              })}
              <Pager page={page} pages={pages} from={from} to={to} total={result.total} href={href} />
            </div>
          </>
        )}
      </PageBody>
    </>
  );
}

function Th({ k, label, className, sort, dir, href }: { k: Sort; label: string; className?: string; sort: Sort; dir: "asc" | "desc"; href: (o: { sort?: Sort; dir?: "asc" | "desc"; page?: number }) => string }) {
  const active = sort === k;
  return (
    <th className={cn("px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted", className)}>
      <Link href={href({ sort: k, dir: active && dir === "asc" ? "desc" : "asc", page: 1 })} className={cn("inline-flex items-center gap-1 hover:text-foreground", active && "text-foreground")}>
        {label}{active ? (dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : null}
      </Link>
    </th>
  );
}

function Pager({ page, pages, from, to, total, href }: { page: number; pages: number; from: number; to: number; total: number; href: (o: { page?: number }) => string }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-t border-border bg-stone-50 text-xs text-muted">
      <span>{from}–{to} de {total.toLocaleString("pt-BR")}</span>
      <div className="flex items-center gap-1">
        <Link href={href({ page: Math.max(1, page - 1) })} aria-disabled={page <= 1} className={cn("h-8 w-8 grid place-items-center rounded-lg hover:bg-stone-200", page <= 1 && "pointer-events-none opacity-40")}><ChevronLeft className="h-4 w-4" /></Link>
        <span className="px-1">Página {page} de {pages}</span>
        <Link href={href({ page: Math.min(pages, page + 1) })} aria-disabled={page >= pages} className={cn("h-8 w-8 grid place-items-center rounded-lg hover:bg-stone-200", page >= pages && "pointer-events-none opacity-40")}><ChevronRight className="h-4 w-4" /></Link>
      </div>
    </div>
  );
}
