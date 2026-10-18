import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageBody, PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { TriangleAlert, CircleCheck, ChevronRight } from "lucide-react";
import { requireAdmin } from "@/lib/data/session";
import { getCronStatus, getMessageCounts, getOverdueInvoices, getRealOrgIds, getStuckNotifications } from "./saude/data";
import { getFunnel, isStale, STALE_DAYS } from "./metricas/data";

export const metadata = { title: "Admin Komyx" };
export const dynamic = "force-dynamic";

function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

/** Things that need a look, each linking to the page that explains it. Empty when all is fine. */
async function getAttention(admin: ReturnType<typeof createAdminClient>) {
  const realOrgIds = await getRealOrgIds(admin);
  const [counts, cron, overdue, funnel, stuck] = await Promise.all([
    getMessageCounts(admin),
    getCronStatus(admin),
    getOverdueInvoices(admin, realOrgIds),
    getFunnel(),
    getStuckNotifications(admin, realOrgIds, 1),
  ]);
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const alerts: { key: string; text: string; href: string }[] = [];
  const failed = counts.email.d1.failed + counts.sms.d1.failed;
  if (failed) alerts.push({ key: "messages", text: `${plural(failed, "envio falhou", "envios falharam")} nas últimas 24h (${counts.email.d1.failed} e-mail, ${counts.sms.d1.failed} SMS)`, href: "/admin/saude" });
  for (const j of cron.filter((c) => c.problem)) alerts.push({ key: `cron-${j.jobname}`, text: `Rotina "${j.label}": ${j.problem?.toLowerCase()}`, href: "/admin/saude" });
  if (stuck.count) alerts.push({ key: "stuck", text: `${plural(stuck.count, "notificação", "notificações")} sem e-mail há mais de 10 minutos`, href: "/admin/saude" });
  if (overdue) alerts.push({ key: "invoices", text: `${plural(overdue, "fatura vencida", "faturas vencidas")} em aberto`, href: "/admin/cobranca" });
  const stale = funnel.filter((r) => r.status === "active" && isStale(r)).length;
  if (stale) alerts.push({ key: "stale", text: `${plural(stale, "buffet parado", "buffets parados")} (sem atividade há mais de ${STALE_DAYS} dias)`, href: "/admin/metricas" });
  return alerts;
}

export default async function AdminDashboard() {
  await requireAdmin();
  const admin = createAdminClient();
  const attentionP = getAttention(admin);
  const since30 = daysAgoIso(30);
  // The demo buffet (is_demo, rebuilt every night) stays out of the platform numbers.
  const { data: demoOrgs } = await admin.from("organizations").select("id").eq("is_demo", true);
  const notDemo = demoOrgs?.length ? `(${demoOrgs.map((o) => o.id).join(",")})` : null;
  const ev30 = admin.from("events").select("id", { count: "exact", head: true }).gte("created_at", since30);
  const self30 = admin.from("events").select("id", { count: "exact", head: true }).gte("created_at", since30).eq("origin", "SELF_SERVICE");
  const req30 = admin.from("public_requests").select("id", { count: "exact", head: true }).gte("created_at", since30);
  const [orgs, stats, recentOrgs, events30, selfService30, requests30] = await Promise.all([
    admin.from("organizations").select("id, status, plan").eq("is_demo", false).neq("kind", "platform"),
    admin.from("admin_org_stats").select("*"),
    admin.from("organizations").select("id, name, slug, plan, status, created_at, is_demo").order("created_at", { ascending: false }).limit(8),
    notDemo ? ev30.not("organization_id", "in", notDemo) : ev30,
    notDemo ? self30.not("organization_id", "in", notDemo) : self30,
    notDemo ? req30.not("organization_id", "in", notDemo) : req30,
  ]);
  const attention = await attentionP;
  const all = orgs.data ?? [];
  const active = all.filter((o) => o.status === "active").length;
  const premium = all.filter((o) => o.plan === "premium").length;
  const paymentsTotal = (stats.data ?? []).filter((s) => !s.is_demo).reduce((a, s) => a + Number(s.payments_total ?? 0), 0);
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
        {attention.length ? (
          <Card className="border-amber-200">
            <CardHeader title="Atenção" subtitle={`${attention.length} ${attention.length === 1 ? "ponto" : "pontos"} para olhar`} />
            <CardBody>
              <ul className="divide-y divide-border">
                {attention.map((a) => (
                  <li key={a.key}>
                    <Link href={a.href} className="flex items-center gap-2 py-2.5 text-sm hover:text-brand">
                      <TriangleAlert className="h-4 w-4 shrink-0 text-amber-600" />
                      <span className="flex-1">{a.text}</span>
                      <ChevronRight className="h-4 w-4 text-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        ) : (
          <p className="text-sm text-muted inline-flex items-center gap-1.5"><CircleCheck className="h-4 w-4 text-emerald-600" /> Tudo certo: envios, rotinas, faturas e buffets sem alertas.</p>
        )}
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
                      <div className="flex gap-1">{o.is_demo ? <Badge tone="amber">demo</Badge> : null}<Badge tone={o.plan === "premium" ? "brand" : "zinc"}>{o.plan}</Badge><Badge tone={o.status === "active" ? "green" : "red"}>{o.status === "active" ? "ativo" : "suspenso"}</Badge></div>
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
