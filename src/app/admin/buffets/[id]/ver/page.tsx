import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/data/session";
import { logAdminAction } from "@/lib/admin/audit";
import { PageBody, PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import { EVENT_STATUS_LABEL, EVENT_STATUS_TONE, PAYMENT_STATUS_LABEL, PAYMENT_STATUS_TONE, QUOTE_STATUS_LABEL, QUOTE_STATUS_TONE } from "@/lib/labels";
import { formatDate, formatDateTime, formatPhone } from "@/lib/utils";

export const metadata = { title: "Ver como · Admin" };
export const dynamic = "force-dynamic";

const HERO_LABEL: Record<string, string> = { cinema: "Cinema", bolha: "Bolha", colagem: "Colagem", confete: "Confete" };

type EventRow = { id: string; title: string | null; starts_at: string; status: keyof typeof EVENT_STATUS_LABEL; expires_at: string | null; origin: string; customers: { name: string } | null };

function partyName(e: { title: string | null; customers: { name: string } | null }) {
  return e.title?.trim() || (e.customers ? `Festa de ${e.customers.name}` : "Evento");
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}

/** Read-only snapshot of what the buffet's owner sees, built with the service role filtered by organization_id. */
export default async function AdminViewAsPage({ params }: PageProps<"/admin/buffets/[id]/ver">) {
  const [{ id }, me] = await Promise.all([params, requireAdmin()]);
  const admin = createAdminClient();
  const { data: org } = await admin.from("organizations").select("id, name, slug, plan, status, public_page, seo_listed, hero_style, self_booking_enabled, show_prices_public, one_event_per_day, pix_key, whatsapp, tagline").eq("id", id).maybeSingle();
  if (!org) notFound();
  await logAdminAction(me, "org.view_as", { organizationId: org.id });

  const now = new Date();
  const nowIso = now.toISOString();
  const in60d = new Date(now.getTime() + 60 * 86_400_000).toISOString();
  const EVENT_SELECT = "id, title, starts_at, status, expires_at, origin, customers(name)";
  const [upcomingRes, preRes, requestsRes, quotesRes, packagesRes, teamRes, owingRes, changesRes] = await Promise.all([
    admin.from("events").select(EVENT_SELECT).eq("organization_id", id).gte("starts_at", nowIso).lte("starts_at", in60d).in("status", ["CONFIRMED", "PRE_RESERVED"]).order("starts_at").limit(15),
    admin.from("events").select(EVENT_SELECT).eq("organization_id", id).eq("status", "PRE_RESERVED").order("expires_at").limit(10),
    admin.from("public_requests").select("id, name, whatsapp, desired_date, participants, adults, children, source, created_at").eq("organization_id", id).eq("status", "NEW").order("created_at", { ascending: false }).limit(10),
    admin.from("quotes").select("id, status, total, created_at, events(title, starts_at, customers(name))").eq("organization_id", id).order("created_at", { ascending: false }).limit(10),
    admin.from("packages").select("id, name, base_price, active, included_adults, included_children").eq("organization_id", id).order("sort_order").order("name"),
    admin.from("profiles").select("id, name, email, role").eq("organization_id", id).order("role").order("name"),
    admin.from("event_financials").select("event_id, balance").eq("organization_id", id).gt("balance", 0),
    admin.from("event_change_requests").select("id", { count: "exact", head: true }).eq("organization_id", id).eq("status", "PENDING"),
  ]);
  const upcoming = (upcomingRes.data ?? []) as EventRow[];
  const pre = (preRes.data ?? []) as EventRow[];

  // Balances for the upcoming parties and the overdue receivables (past confirmed/done parties still owing).
  const balanceOf = new Map((owingRes.data ?? []).map((f) => [f.event_id, Number(f.balance)]));
  const [{ data: finUpcoming }, { data: owingEvents }] = await Promise.all([
    upcoming.length ? admin.from("event_financials").select("event_id, balance, payment_status").in("event_id", upcoming.map((e) => e.id)) : Promise.resolve({ data: [] }),
    balanceOf.size ? admin.from("events").select("id, title, starts_at, customers(name)").in("id", [...balanceOf.keys()].filter((k): k is string => Boolean(k))).in("status", ["CONFIRMED", "DONE"]).lt("starts_at", nowIso).order("starts_at") : Promise.resolve({ data: [] }),
  ]);
  const finById = new Map((finUpcoming ?? []).map((f) => [f.event_id, f]));
  const overdue = (owingEvents ?? []) as { id: string; title: string | null; starts_at: string; customers: { name: string } | null }[];
  const overdueTotal = overdue.reduce((a, e) => a + (balanceOf.get(e.id) ?? 0), 0);
  const expiringSoon = pre.filter((e) => e.expires_at && new Date(e.expires_at).getTime() - now.getTime() < 48 * 3_600_000);

  return (
    <>
      <PageHeader title={`Ver como · ${org.name}`} subtitle={`/p/${org.slug}`} back={`/admin/buffets/${org.id}`} />
      <PageBody>
        <div role="status" className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-center gap-2">
          <Eye className="h-4 w-4 shrink-0" />
          <span><b>Visualização do admin · somente leitura.</b> É o que a equipe do {org.name} vê hoje; nada aqui altera o buffet.</span>
        </div>

        <Card>
          <CardHeader title="Pendências" subtitle="O que está esperando o buffet" />
          <CardBody>
            <ul className="text-sm space-y-1">
              <li>{pre.length} {pre.length === 1 ? "reserva aguardando" : "reservas aguardando"} confirmação{expiringSoon.length ? <> · <span className="text-amber-700">{expiringSoon.length} vence{expiringSoon.length === 1 ? "" : "m"} em 48 h</span></> : null}</li>
              <li>{requestsRes.data?.length ?? 0} {requestsRes.data?.length === 1 ? "pedido novo" : "pedidos novos"} da página pública</li>
              <li>{changesRes.count ?? 0} {changesRes.count === 1 ? "pedido de cliente" : "pedidos de clientes"} sem resposta</li>
              <li>{overdue.length ? <span className="text-red-700"><Money value={overdueTotal} /> em atraso ({overdue.length} {overdue.length === 1 ? "festa já realizada" : "festas já realizadas"})</span> : "Nada em atraso"}</li>
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Próximas festas" subtitle="Confirmadas e aguardando, nos próximos 60 dias" />
          <CardBody>
            {upcoming.length ? (
              <ul className="divide-y divide-border text-sm">
                {upcoming.map((e) => {
                  const f = finById.get(e.id);
                  return (
                    <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <span className="min-w-0"><b className="font-medium">{formatDateTime(e.starts_at)}</b> · {partyName(e)}{e.customers ? <span className="text-muted"> · {e.customers.name}</span> : null}</span>
                      <span className="flex items-center gap-1">
                        <Badge tone={EVENT_STATUS_TONE[e.status]}>{EVENT_STATUS_LABEL[e.status]}</Badge>
                        {f?.payment_status ? <Badge tone={PAYMENT_STATUS_TONE[f.payment_status] ?? "zinc"}>{PAYMENT_STATUS_LABEL[f.payment_status] ?? f.payment_status}</Badge> : null}
                        {f && Number(f.balance) > 0 ? <span className="text-xs text-muted">saldo <Money value={Number(f.balance)} /></span> : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : <Empty>Nenhuma festa nos próximos 60 dias.</Empty>}
          </CardBody>
        </Card>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader title="Reservas aguardando confirmação" />
            <CardBody>
              {pre.length ? (
                <ul className="divide-y divide-border text-sm">
                  {pre.map((e) => (
                    <li key={e.id} className="py-2">
                      <p className="font-medium">{partyName(e)} {e.origin === "SELF_SERVICE" ? <Badge tone="brand">online</Badge> : null}</p>
                      <p className="text-xs text-muted">Festa {formatDateTime(e.starts_at)}{e.expires_at ? ` · vence ${formatDateTime(e.expires_at)}` : ""}</p>
                    </li>
                  ))}
                </ul>
              ) : <Empty>Nenhuma reserva aguardando.</Empty>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Pedidos novos" subtitle="Da página pública, ainda não respondidos" />
            <CardBody>
              {requestsRes.data?.length ? (
                <ul className="divide-y divide-border text-sm">
                  {requestsRes.data.map((r) => (
                    <li key={r.id} className="py-2">
                      <p className="font-medium">{r.name} <span className="text-xs text-muted font-normal">{formatPhone(r.whatsapp)}</span></p>
                      <p className="text-xs text-muted">{r.desired_date ? `Para ${formatDate(r.desired_date)} · ` : ""}{r.participants ?? (r.adults ?? 0) + (r.children ?? 0)} pessoas · chegou {formatDateTime(r.created_at)}</p>
                    </li>
                  ))}
                </ul>
              ) : <Empty>Nenhum pedido novo.</Empty>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Orçamentos recentes" />
            <CardBody>
              {quotesRes.data?.length ? (
                <ul className="divide-y divide-border text-sm">
                  {quotesRes.data.map((q) => (
                    <li key={q.id} className="flex items-center justify-between gap-2 py-2">
                      <span className="min-w-0 truncate">{q.events ? partyName(q.events) : "Orçamento"} <span className="text-xs text-muted">· {formatDate(q.created_at)}</span></span>
                      <span className="flex items-center gap-2"><Money value={Number(q.total)} /><Badge tone={QUOTE_STATUS_TONE[q.status]}>{QUOTE_STATUS_LABEL[q.status]}</Badge></span>
                    </li>
                  ))}
                </ul>
              ) : <Empty>Nenhum orçamento ainda.</Empty>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Em atraso" subtitle="Festas já realizadas com saldo a receber" />
            <CardBody>
              {overdue.length ? (
                <ul className="divide-y divide-border text-sm">
                  {overdue.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-2 py-2">
                      <span className="min-w-0 truncate">{partyName(e)} <span className="text-xs text-muted">· {formatDate(e.starts_at)}</span></span>
                      <Money value={balanceOf.get(e.id) ?? 0} />
                    </li>
                  ))}
                </ul>
              ) : <Empty>Nada em atraso.</Empty>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Pacotes" />
            <CardBody>
              {packagesRes.data?.length ? (
                <ul className="divide-y divide-border text-sm">
                  {packagesRes.data.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 py-2">
                      <span className="min-w-0 truncate">{p.name} <span className="text-xs text-muted">· {p.included_adults} adultos + {p.included_children} crianças</span></span>
                      <span className="flex items-center gap-2"><Money value={Number(p.base_price)} />{p.active ? null : <Badge tone="zinc">inativo</Badge>}</span>
                    </li>
                  ))}
                </ul>
              ) : <Empty>Nenhum pacote cadastrado.</Empty>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Equipe" />
            <CardBody>
              <ul className="divide-y divide-border text-sm">
                {(teamRes.data ?? []).map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-2 py-2">
                    <span className="min-w-0 truncate">{m.name} <span className="text-xs text-muted">· {m.email}</span></span>
                    <Badge tone={m.role === "owner" ? "brand" : "zinc"}>{m.role === "owner" ? "Responsável" : "Equipe"}</Badge>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader title="Página pública" />
          <CardBody>
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {[
                ["Página no ar", org.public_page ? "Sim" : "Não"],
                ["Aparece no Google", org.seo_listed ? "Sim" : "Não"],
                ["Estilo do topo", HERO_LABEL[org.hero_style] ?? org.hero_style],
                ["Reserva online", org.self_booking_enabled ? "Ligada" : "Desligada"],
                ["Mostra preços", org.show_prices_public ? "Sim" : "Não"],
                ["Uma festa por dia", org.one_event_per_day ? "Sim" : "Não"],
                ["Pix", org.pix_key ? "Configurado" : "Não configurado"],
                ["WhatsApp", org.whatsapp ? formatPhone(org.whatsapp) : "—"],
              ].map(([k, v]) => (
                <div key={k}><dt className="text-xs text-muted">{k}</dt><dd className="font-medium">{v}</dd></div>
              ))}
            </dl>
            <p className="text-sm mt-3"><Link href={`/p/${org.slug}`} target="_blank" className="text-brand">Abrir /p/{org.slug}</Link></p>
          </CardBody>
        </Card>
      </PageBody>
    </>
  );
}
