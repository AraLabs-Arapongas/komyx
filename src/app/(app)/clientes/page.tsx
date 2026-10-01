import Link from "next/link";
import { Plus, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageBody, PageHeader, EmptyState } from "@/components/ui/page";
import { buttonClass } from "@/components/ui/button";
import { formatPhone, normalizePhone } from "@/lib/utils";

export const metadata = { title: "Clientes" };

export default async function CustomersPage({ searchParams }: PageProps<"/clientes">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const supabase = await createClient();
  let query = supabase.from("customers").select("id, name, whatsapp, email, events(count)").order("name").limit(200);
  if (q) {
    const digits = normalizePhone(q);
    query = digits.length >= 4 && /^[\d\s()+-]+$/.test(q) ? query.ilike("whatsapp", `%${digits}%`) : query.ilike("name", `%${q}%`);
  }
  const { data: customers } = await query;

  return (
    <>
      <PageHeader title="Clientes" action={<Link href="/clientes/novo" className={buttonClass("primary", "sm")}><Plus className="h-4 w-4" /> Novo</Link>} />
      <PageBody>
        <form className="flex gap-2">
          <input name="q" defaultValue={q} placeholder="Buscar por nome ou WhatsApp" className="h-11 flex-1 rounded-xl border border-border bg-surface px-3.5" />
          <button className={buttonClass("outline", "md")}>Buscar</button>
        </form>
        {customers && customers.length > 0 ? (
          <ul className="rounded-2xl border border-border bg-surface divide-y divide-border overflow-hidden">
            {customers.map((c) => (
              <li key={c.id}>
                <Link href={`/clientes/${c.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-stone-50">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{c.name}</p>
                    <p className="text-sm text-muted">{formatPhone(c.whatsapp)} · {c.events?.[0]?.count ?? 0} evento(s)</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Nenhum cliente" description={q ? "Nada encontrado para essa busca." : "Clientes são criados automaticamente no orçamento ou aqui."} action={<Link href="/clientes/novo" className={buttonClass("primary", "sm")}>Novo cliente</Link>} />
        )}
      </PageBody>
    </>
  );
}
