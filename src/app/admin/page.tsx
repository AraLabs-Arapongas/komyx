import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageBody, PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Admin Komyx" };
export const dynamic = "force-dynamic";

function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export default async function AdminDashboard() {
  const admin = createAdminClient();
  const since30 = daysAgoIso(30);
  const [orgs, stats, recentOrgs, events30, selfService30, requests30] = await Promise.all([
    admin.from("organizations").select("id, status, plan"),
    admin.from("admin_org_stats").select("*"),
    admin.from("organizations").select("id, name, slug, plan, status, created_at").order("created_at", { ascending: false }).limit(8),
    admin.from("events").select("id", { count: "exact", head: true }).gte("created_at", since30),
    admin.from("events").select("id", { count: "exact", head: true }).gte("created_at", since30).eq("origin", "SELF_SERVICE"),
    admin.from("public_requests").select("id", { count: "exact", head: true }).gte("created_at", since30),
  ]);
  const all = orgs.data ?? [];
  const active = all.filter((o) => o.status === "active").length;
  const premium = all.filter((o) => o.plan === "premium").length;
  const paymentsTotal = (stats.data ?? []).reduce((a, s) => a + Number(s.payments_total ?? 0), 0);
  const statById = new Map((stats.data ?? []).map((s) => [s.organization_id, s]));

  return (
    <>
      <PageHeader title="Visão geral" subtitle="Plataforma Komyx" action={<Link href="/admin/buffets/novo" className={buttonClass("primary", "sm")}>Novo buffet</Link>} />
      <PageBody>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ["Buffets ativos", `${active}`, `${all.length - active} suspensos · ${premium} premium`],
            ["Eventos (30d)", `${events30.count ?? 0}`, `${selfService30.count ?? 0} reservas online`],
            ["Solicitações (30d)", `${requests30.count ?? 0}`, "leads das páginas públicas"],
            ["Pagamentos registrados", formatCurrency(paymentsTotal), "soma de todos os buffets"],
          ].map(([t, v, h]) => (
            <div key={t} className="rounded-2xl border border-border bg-surface p-4"><p className="text-xs text-muted">{t}</p><p className="text-2xl font-semibold mt-1">{v}</p><p className="text-xs text-muted">{h}</p></div>
          ))}
        </div>
        <Card>
          <CardHeader title="Buffets recentes" action={<Link href="/admin/buffets" className="text-sm text-brand font-medium">Ver todos</Link>} />
          <CardBody>
            <ul className="divide-y divide-border">
              {(recentOrgs.data ?? []).map((o) => {
                const st = statById.get(o.id);
                return (
                  <li key={o.id}>
                    <Link href={`/admin/buffets/${o.id}`} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0"><p className="font-medium truncate">{o.name}</p><p className="text-xs text-muted">/p/{o.slug} · criado {formatDateTime(o.created_at)} · {st?.events_total ?? 0} eventos</p></div>
                      <div className="flex gap-1"><Badge tone={o.plan === "premium" ? "brand" : "zinc"}>{o.plan}</Badge><Badge tone={o.status === "active" ? "green" : "red"}>{o.status === "active" ? "ativo" : "suspenso"}</Badge></div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      </PageBody>
    </>
  );
}
