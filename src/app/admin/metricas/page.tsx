import Link from "next/link";
import { Globe, Inbox, Package, PartyPopper, UserPlus } from "lucide-react";
import { requireAdmin } from "@/lib/data/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageBody, PageHeader, EmptyState } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { cn, formatDate, formatDateTime, toDateKey } from "@/lib/utils";
import { getFunnel, isStale, STALE_DAYS, type FunnelRow } from "./data";
import { Tooltip } from "@/components/ui/tooltip";

export const metadata = { title: "Métricas · Admin Komyx" };
export const dynamic = "force-dynamic";

const DAY = 86_400_000;

/** Monday (YYYY-MM-DD) of the week of a date, in the app timezone. */
function weekKey(value: string | Date) {
  const d = new Date(`${toDateKey(value)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

function pct(part: number, total: number) {
  if (!total) return "—";
  return `${Math.round((part / total) * 100)}%`;
}

const MILESTONES = [
  { key: "created", label: "Conta criada", icon: UserPlus, reached: () => true, at: (r: FunnelRow) => r.created_at as string | null },
  { key: "package", label: "Criou pacote", icon: Package, reached: (r: FunnelRow) => Boolean(r.first_package_at), at: (r: FunnelRow) => r.first_package_at },
  { key: "page", label: "Página pública ligada", icon: Globe, reached: (r: FunnelRow) => r.public_page, at: () => null },
  { key: "request", label: "Primeiro pedido recebido", icon: Inbox, reached: (r: FunnelRow) => Boolean(r.first_request_at), at: (r: FunnelRow) => r.first_request_at },
  { key: "confirmed", label: "Primeira festa confirmada", icon: PartyPopper, reached: (r: FunnelRow) => Boolean(r.first_confirmed_at), at: (r: FunnelRow) => r.first_confirmed_at },
] as const;

async function salesFunnel(admin: ReturnType<typeof createAdminClient>, orgIds: string[], days: number) {
  if (!orgIds.length) return { requests: 0, quotes: 0, confirmed: 0 };
  const since = new Date(Date.now() - days * DAY).toISOString();
  const [requests, quotes, confirmed] = await Promise.all([
    admin.from("public_requests").select("id", { count: "exact", head: true }).in("organization_id", orgIds).gte("created_at", since),
    admin.from("quotes").select("id", { count: "exact", head: true }).in("organization_id", orgIds).gte("created_at", since),
    // Events created in the window that are confirmed (or already happened) now.
    admin.from("events").select("id", { count: "exact", head: true }).in("organization_id", orgIds).in("status", ["CONFIRMED", "DONE"]).gte("created_at", since),
  ]);
  return { requests: requests.count ?? 0, quotes: quotes.count ?? 0, confirmed: confirmed.count ?? 0 };
}

function Bar({ value, max, className }: { value: number; max: number; className?: string }) {
  const w = max ? Math.max((value / max) * 100, value ? 2 : 0) : 0;
  return <div className="h-2.5 rounded-full bg-stone-100 overflow-hidden"><div className={cn("h-full rounded-full bg-brand", className)} style={{ width: `${w}%` }} /></div>;
}

export default async function AdminMetricsPage() {
  await requireAdmin();
  const admin = createAdminClient();
  const rows = await getFunnel();
  const orgIds = rows.map((r) => r.organization_id);
  const [s30, s90] = await Promise.all([salesFunnel(admin, orgIds, 30), salesFunnel(admin, orgIds, 90)]);

  // New buffets per week, last 12 weeks (oldest first).
  const thisWeek = weekKey(new Date());
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(`${thisWeek}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - (11 - i) * 7);
    return d.toISOString().slice(0, 10);
  });
  const perWeek = new Map(weeks.map((w) => [w, 0]));
  for (const r of rows) {
    const k = weekKey(r.created_at);
    if (perWeek.has(k)) perWeek.set(k, (perWeek.get(k) ?? 0) + 1);
  }
  const weekMax = Math.max(1, ...perWeek.values());
  const new12 = [...perWeek.values()].reduce((a, b) => a + b, 0);

  const total = rows.length;
  const activation = MILESTONES.map((m) => ({ ...m, count: rows.filter((r) => m.reached(r)).length }));
  const staleIds = new Set(rows.filter((r) => isStale(r)).map((r) => r.organization_id));
  const stale = staleIds.size;

  return (
    <>
      <PageHeader title="Métricas" subtitle={`${total} ${total === 1 ? "buffet real" : "buffets reais"} · demos e plataforma ficam de fora`} />
      <PageBody className="space-y-4 max-w-6xl">
        {!total ? (
          <EmptyState
            title="Nenhum buffet real ainda"
            description="Quando o primeiro buffet for criado, a ativação e as vendas aparecem aqui. Os buffets de demonstração não contam."
            action={<Link href="/admin/buffets/novo" className={buttonClass("primary", "sm")}>Novo buffet</Link>}
          />
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader title="Novos buffets por semana" subtitle={`Últimas 12 semanas · ${new12} no total`} />
            <CardBody>
              <div className="flex items-end gap-1.5 h-36" role="img" aria-label="Novos buffets por semana">
                {weeks.map((w) => {
                  const n = perWeek.get(w) ?? 0;
                  return (
                    <Tooltip key={w} className="flex-1 h-full flex flex-col justify-end items-center gap-1 outline-none" content={<><span className="font-medium">Semana de {formatDate(`${w}T12:00:00Z`, { year: undefined })}</span><br /><span className="text-stone-300">{n} {n === 1 ? "buffet novo" : "buffets novos"}</span></>}>
                      <span className={cn("text-xs", n ? "font-medium" : "text-stone-300")}>{n}</span>
                      <span className={cn("block w-full rounded-t-md", n ? "bg-brand" : "bg-stone-100")} style={{ height: `${n ? Math.max((n / weekMax) * 100, 6) : 3}%` }} />
                    </Tooltip>
                  );
                })}
              </div>
              <div className="flex gap-1.5 mt-1 text-[10px] text-muted">
                {weeks.map((w, i) => <span key={w} className="flex-1 text-center truncate">{i % 2 === 1 || i === 11 ? formatDate(`${w}T12:00:00Z`, { year: undefined }) : ""}</span>)}
              </div>
              {!new12 ? <p className="text-sm text-muted mt-3">Nenhum buffet novo nas últimas 12 semanas.</p> : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Funil de ativação" subtitle="Quantos buffets já chegaram a cada marco" />
            <CardBody className="space-y-3">
              {activation.map(({ key, label, icon: Icon, count }) => (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="inline-flex items-center gap-2"><Icon className="h-4 w-4 text-muted" />{label}</span>
                    <span className="tabular-nums"><span className="font-semibold">{count}</span> <span className="text-muted">· {pct(count, total)}</span></span>
                  </div>
                  <Bar value={count} max={total} />
                </div>
              ))}
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader title="Funil de vendas" subtitle="Somando os buffets reais. Festas: criadas no período e hoje confirmadas ou realizadas." />
          <CardBody className="grid gap-6 md:grid-cols-2">
            {([["Últimos 30 dias", s30], ["Últimos 90 dias", s90]] as const).map(([title, s]) => {
              const steps = [
                { label: "Pedidos", hint: "pela página pública", value: s.requests, conv: null as string | null },
                { label: "Orçamentos", hint: "inclui os feitos sem pedido", value: s.quotes, conv: s.requests ? `${pct(s.quotes, s.requests)} dos pedidos` : null },
                { label: "Festas confirmadas", hint: "", value: s.confirmed, conv: s.quotes ? `${pct(s.confirmed, s.quotes)} dos orçamentos` : null },
              ];
              const max = Math.max(1, ...steps.map((x) => x.value));
              const empty = !s.requests && !s.quotes && !s.confirmed;
              return (
                <div key={title} className="space-y-3">
                  <p className="text-sm font-medium">{title}</p>
                  {empty ? <p className="text-sm text-muted">Nenhum pedido, orçamento ou festa no período.</p> : steps.map((st) => (
                    <div key={st.label} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span>{st.label} {st.hint ? <span className="text-muted text-xs">{st.hint}</span> : null}</span>
                        <span className="tabular-nums"><span className="font-semibold">{st.value}</span>{st.conv ? <span className="text-muted"> · {st.conv}</span> : null}</span>
                      </div>
                      <Bar value={st.value} max={max} />
                    </div>
                  ))}
                  {!empty && s.requests ? <p className="text-xs text-muted">Pedido → festa: {pct(s.confirmed, s.requests)}</p> : null}
                </div>
              );
            })}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Buffets" subtitle={`${stale} ${stale === 1 ? "parado" : "parados"} · parado = sem atividade há mais de ${STALE_DAYS} dias, ou nunca`} />
          <CardBody>
            {rows.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted text-left">
                    <tr>
                      <th className="py-2 pr-3 font-medium">Buffet</th>
                      <th className="py-2 pr-3 font-medium">Plano</th>
                      <th className="py-2 pr-3 font-medium">Criado</th>
                      <th className="py-2 pr-3 font-medium">Marcos</th>
                      <th className="py-2 pr-3 font-medium">Última atividade</th>
                      <th className="py-2 pr-3 font-medium text-right">Pedidos</th>
                      <th className="py-2 pr-3 font-medium text-right">Orçamentos</th>
                      <th className="py-2 font-medium text-right">Festas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((r) => (
                      <tr key={r.organization_id} className="align-middle">
                        <td className="py-2 pr-3">
                          <Link href={`/admin/buffets/${r.organization_id}`} className="font-medium hover:text-brand">{r.name}</Link>
                          <span className="ml-1.5 inline-flex gap-1">
                            {r.status !== "active" ? <Badge tone="red">suspenso</Badge> : null}
                            {staleIds.has(r.organization_id) ? <Badge tone="amber">parado</Badge> : null}
                          </span>
                        </td>
                        <td className="py-2 pr-3"><Badge tone={r.plan === "premium" ? "brand" : "zinc"}>{r.plan}</Badge></td>
                        <td className="py-2 pr-3 whitespace-nowrap">{formatDate(r.created_at)}</td>
                        <td className="py-2 pr-3">
                          <span className="inline-flex gap-1">
                            {MILESTONES.slice(1).map(({ key, label, icon: Icon, reached, at }) => {
                              const ok = reached(r);
                              const when = ok ? at(r) : null;
                              return (
                                <Tooltip key={key} className="outline-none focus-visible:ring-2 focus-visible:ring-brand/40 rounded-full" content={<><span className="font-medium">{label}</span><br /><span className="text-stone-300">{ok ? (when ? `em ${formatDate(when)}` : "sim") : "ainda não"}</span></>}>
                                  <span aria-label={`${label}: ${ok ? "sim" : "ainda não"}`} className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full cursor-default", ok ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-300")}>
                                    <Icon className="h-3.5 w-3.5" />
                                  </span>
                                </Tooltip>
                              );
                            })}
                          </span>
                        </td>
                        <td className="py-2 pr-3 whitespace-nowrap">{r.last_activity_at ? formatDateTime(r.last_activity_at) : <span className="text-muted">nunca</span>}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{r.requests}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{r.quotes}</td>
                        <td className="py-2 text-right tabular-nums">{r.confirmed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-sm text-muted">Nenhum buffet real ainda.</p>}
          </CardBody>
        </Card>
      </PageBody>
    </>
  );
}
