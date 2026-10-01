import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageBody, PageHeader, EmptyState } from "@/components/ui/page";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

export const metadata = { title: "Buffets · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminBuffetsPage({ searchParams }: PageProps<"/admin/buffets">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const status = sp.status === "suspended" ? "suspended" : sp.status === "active" ? "active" : "all";
  const admin = createAdminClient();
  let query = admin.from("organizations").select("id, name, slug, plan, status, created_at, whatsapp").eq("kind", "buffet").order("created_at", { ascending: false }).limit(200);
  if (q) query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%`);
  if (status !== "all") query = query.eq("status", status);
  const [{ data: orgs }, { data: stats }, { data: owners }] = await Promise.all([
    query,
    admin.from("admin_org_stats").select("*"),
    admin.from("profiles").select("organization_id, email, name").eq("role", "owner"),
  ]);
  const statById = new Map((stats ?? []).map((s) => [s.organization_id, s]));
  const ownerByOrg = new Map((owners ?? []).map((o) => [o.organization_id, o]));

  return (
    <>
      <PageHeader title="Buffets" subtitle={`${orgs?.length ?? 0} na lista`} action={<Link href="/admin/buffets/novo" className={buttonClass("primary", "sm")}>Novo buffet</Link>} />
      <PageBody>
        <form className="flex gap-2">
          <input type="hidden" name="status" value={status} />
          <input name="q" defaultValue={q} placeholder="Buscar por nome ou slug" className="h-11 flex-1 rounded-xl border border-border bg-surface px-3.5" />
          <button className={buttonClass("outline", "md")}>Buscar</button>
        </form>
        <div className="flex gap-2">
          {[["all", "Todos"], ["active", "Ativos"], ["suspended", "Suspensos"]].map(([k, l]) => (
            <Link key={k} href={`/admin/buffets?status=${k}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={cn("rounded-full px-3.5 py-1.5 text-sm font-medium border", status === k ? "bg-brand text-brand-fg border-brand" : "bg-surface border-border text-muted")}>{l}</Link>
          ))}
        </div>
        {orgs && orgs.length ? (
          <div className="rounded-2xl border border-border bg-surface overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-xs text-muted text-left"><tr><th className="px-4 py-2">Buffet</th><th className="px-2 py-2">Responsável</th><th className="px-2 py-2">Plano</th><th className="px-2 py-2">Eventos</th><th className="px-2 py-2">Pagamentos</th><th className="px-2 py-2">Último evento</th><th className="px-2 py-2"></th></tr></thead>
              <tbody className="divide-y divide-border">
                {orgs.map((o) => {
                  const st = statById.get(o.id);
                  const ow = ownerByOrg.get(o.id);
                  return (
                    <tr key={o.id} className="hover:bg-stone-50">
                      <td className="px-4 py-2.5"><Link href={`/admin/buffets/${o.id}`} className="font-medium hover:underline">{o.name}</Link><p className="text-xs text-muted">/p/{o.slug} · desde {formatDate(o.created_at)}</p></td>
                      <td className="px-2 py-2.5 text-xs">{ow ? <>{ow.name}<br /><span className="text-muted">{ow.email}</span></> : <span className="text-muted">—</span>}</td>
                      <td className="px-2 py-2.5"><div className="flex gap-1"><Badge tone={o.plan === "premium" ? "brand" : "zinc"}>{o.plan}</Badge>{o.status !== "active" ? <Badge tone="red">suspenso</Badge> : null}</div></td>
                      <td className="px-2 py-2.5">{st?.events_total ?? 0} <span className="text-xs text-muted">({st?.events_30d ?? 0} em 30d)</span></td>
                      <td className="px-2 py-2.5">{formatCurrency(st?.payments_total ?? 0)}</td>
                      <td className="px-2 py-2.5 text-xs text-muted">{st?.last_event_at ? formatDate(st.last_event_at) : "—"}</td>
                      <td className="px-2 py-2.5 text-right"><Link href={`/admin/buffets/${o.id}`} className="text-brand text-xs font-medium">Gerenciar</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="Nenhum buffet" description="Crie o primeiro buffet ou ajuste a busca." />}
      </PageBody>
    </>
  );
}
