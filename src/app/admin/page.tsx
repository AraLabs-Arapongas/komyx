import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageBody, PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { TriangleAlert, CircleCheck, ChevronRight } from "lucide-react";
import { requireAdmin } from "@/lib/data/session";
import { getCronStatus, getMessageCounts, getRealOrgIds, getStuckNotifications } from "./saude/data";
import { getFunnel, isStale, STALE_DAYS } from "./metricas/data";
import { getBusinessHealth } from "./business";
import { RevenueChart } from "./revenue-chart";

export const metadata = { title: "Admin Komyx" };
export const dynamic = "force-dynamic";

function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

/** Things that need a look, each linking to the page that explains it. Empty when all is fine. */
async function getAttention(admin: ReturnType<typeof createAdminClient>) {
  const realOrgIds = await getRealOrgIds(admin);
  // Late invoices are listed per buffet by the business alerts (getBusinessHealth).
  const [counts, cron, funnel, stuck] = await Promise.all([
    getMessageCounts(admin),
    getCronStatus(admin),
    getFunnel(),
    getStuckNotifications(admin, realOrgIds, 1),
  ]);
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const alerts: { key: string; text: string; href: string }[] = [];
  const failed = counts.email.d1.failed + counts.sms.d1.failed;
  if (failed) alerts.push({ key: "messages", text: `${plural(failed, "envio falhou", "envios falharam")} nas últimas 24h (${counts.email.d1.failed} e-mail, ${counts.sms.d1.failed} SMS)`, href: "/admin/saude" });
  for (const j of cron.filter((c) => c.problem)) alerts.push({ key: `cron-${j.jobname}`, text: `Rotina "${j.label}": ${j.problem?.toLowerCase()}`, href: "/admin/saude" });
  if (stuck.count) alerts.push({ key: "stuck", text: `${plural(stuck.count, "notificação", "notificações")} sem e-mail há mais de 10 minutos`, href: "/admin/saude" });
  const stale = funnel.filter((r) => r.status === "active" && isStale(r)).length;
  if (stale) alerts.push({ key: "stale", text: `${plural(stale, "buffet parado", "buffets parados")} (sem atividade há mais de ${STALE_DAYS} dias)`, href: "/admin/metricas" });
  return alerts;
}

export default async function AdminDashboard() {
  await requireAdmin();
  const admin = createAdminClient();
  const attentionP = getAttention(admin);
  const healthP = getBusinessHealth(admin);
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
  const [attention, health] = await Promise.all([attentionP, healthP]);
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const delta = health.receivedLastMonth ? (health.receivedThisMonth - health.receivedLastMonth) / health.receivedLastMonth : null;
  // Business alerts first: late and paused buffets, trials about to end that can't pay yet.
  const businessAlerts = [
    ...health.lateList.map((b) => ({ key: `late-${b.id}`, text: `${b.name}: ${b.paused ? "acesso pausado" : "mensalidade atrasada"} desde ${b.oldest.split("-").reverse().join("/")}`, href: `/admin/buffets/${b.id}?aba=plano`, danger: b.paused })),
    ...health.trialsNoData.map((b) => ({ key: `trial-${b.id}`, text: `${b.name}: teste termina ${b.ends ? `em ${b.ends.split("-").reverse().join("/")}` : "em breve"} sem CNPJ/CPF ou WhatsApp (não vai conseguir pagar)`, href: `/admin/buffets/${b.id}?aba=dados`, danger: false })),
  ];
  const allAlerts = [...businessAlerts, ...attention.map((a) => ({ ...a, danger: false }))];
  const all = orgs.data ?? [];
  const active = all.filter((o) => o.status === "active").length;
  const premium = all.filter((o) => o.plan === "premium").length;
  const paymentsTotal = (stats.data ?? []).filter((s) => !s.is_demo).reduce((a, s) => a + Number(s.payments_total ?? 0), 0);
  const statById = new Map((stats.data ?? []).map((s) => [s.organization_id, s]));

  return (
    <>
      <PageHeader title="Visão geral" subtitle="Plataforma Komyx" action={<Link href="/admin/buffets/novo" className={buttonClass("primary", "sm")}>Novo buffet</Link>} />
      <PageBody>
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted">Dinheiro da Komyx</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat title="Receita recorrente (MRR)" value={formatCurrency(health.mrr)} hint={`${formatCurrency(health.arr)} por ano`} />
            <Stat title="Recebido no mês" value={formatCurrency(health.receivedThisMonth)} hint={delta === null ? `mês passado: ${formatCurrency(health.receivedLastMonth)}` : `${delta >= 0 ? "+" : ""}${pct(delta)} vs. mês passado (${formatCurrency(health.receivedLastMonth)})`} />
            <Stat title="A receber (30 dias)" value={formatCurrency(health.upcoming.total)} hint={`${health.upcoming.count} ${health.upcoming.count === 1 ? "fatura" : "faturas"} a vencer`} />
            <Stat title="Em atraso" value={formatCurrency(health.late.total)} hint={`${health.late.buffets} ${health.late.buffets === 1 ? "buffet" : "buffets"} · ${health.late.paused} pausado${health.late.paused === 1 ? "" : "s"}`} tone={health.late.buffets ? "red" : undefined} />
          </div>
        </section>
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted">Clientes</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat title="Buffets pagantes" value={`${health.paying}`} hint={`+${health.newPaying} no mês · −${health.churned} cancelado${health.churned === 1 ? "" : "s"}`} />
            <Stat title="Em teste grátis" value={`${health.trials}`} hint={`${health.trialsEnding} ${health.trialsEnding === 1 ? "termina" : "terminam"} em 7 dias`} />
            <Stat title="Conversão do teste (90 dias)" value={health.conversion.rate === null ? "—" : pct(health.conversion.rate)} hint={`${health.conversion.converted} de ${health.conversion.ended} testes viraram pagantes`} />
            <Stat title="Cancelamentos no mês" value={`${health.churned}`} hint={`churn ${pct(health.churnRate)} dos pagantes`} tone={health.churned ? "red" : undefined} />
          </div>
        </section>
        <Card>
          <CardHeader title="Receita dos últimos 12 meses" subtitle="Mensalidades recebidas por mês; passe o mouse para ver os pagantes" />
          <CardBody><RevenueChart series={health.series} /></CardBody>
        </Card>
        {allAlerts.length ? (
          <Card className="border-amber-200">
            <CardHeader title="Atenção" subtitle={`${allAlerts.length} ${allAlerts.length === 1 ? "ponto" : "pontos"} para olhar`} />
            <CardBody>
              <ul className="divide-y divide-border">
                {allAlerts.map((a) => (
                  <li key={a.key}>
                    <Link href={a.href} className="flex items-center gap-2 py-2.5 text-sm hover:text-brand">
                      <TriangleAlert className={a.danger ? "h-4 w-4 shrink-0 text-red-600" : "h-4 w-4 shrink-0 text-amber-600"} />
                      <span className="flex-1">{a.text}</span>
                      <ChevronRight className="h-4 w-4 text-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        ) : (
          <p className="text-sm text-muted inline-flex items-center gap-1.5"><CircleCheck className="h-4 w-4 text-emerald-600" /> Tudo certo: pagamentos em dia, envios, rotinas e buffets sem alertas.</p>
        )}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted">Uso do produto</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat title="Buffets ativos" value={`${active}`} hint={`${all.length - active} suspensos · ${premium} premium`} />
            <Stat title="Eventos (30d)" value={`${events30.count ?? 0}`} hint={`${selfService30.count ?? 0} reservas online`} />
            <Stat title="Solicitações (30d)" value={`${requests30.count ?? 0}`} hint="pedidos das páginas públicas" />
            <Stat title="Recebido pelos buffets" value={formatCurrency(paymentsTotal)} hint="pagamentos de festas registrados no Komyx" />
          </div>
        </section>
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

function Stat({ title, value, hint, tone }: { title: string; value: string; hint: string; tone?: "red" }) {
  return (
    <div className={tone === "red" ? "rounded-2xl border border-red-200 bg-red-50/40 p-4" : "rounded-2xl border border-border bg-surface p-4"}>
      <p className="text-xs text-muted">{title}</p>
      <p className={tone === "red" ? "text-2xl font-semibold mt-1 text-red-700" : "text-2xl font-semibold mt-1"}>{value}</p>
      <p className="text-xs text-muted">{hint}</p>
    </div>
  );
}
