import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Eye } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/data/session";
import { adminSetRole } from "@/lib/actions/admin";
import { PageBody, PageHeader, Alert } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { appUrl, formatCurrency, formatDate, formatDateTime, formatPhone, whatsappLink } from "@/lib/utils";
import { buttonClass } from "@/components/ui/button";
import { AccessLinkForm, OrgAdminForm, ResetPasswordForm, SendResetForm } from "./forms";
import { emailIsLogged } from "@/lib/auth/access-link";
import { PendingButton } from "@/components/ui/pending-button";
import { BrowserTabPanel, BrowserTabs } from "@/components/ui/browser-tabs";
import { IDLE_DAYS, daysAgoIso, isIdle, orgLastActivity } from "../activity";

const SOURCE_LABEL: Record<string, string> = { evento: "evento alterado", pedido: "pedido na página pública", pagamento: "pagamento registrado", login: "login da equipe" };

export const dynamic = "force-dynamic";

const TABS = [["geral", "Visão geral"], ["dados", "Dados"], ["plano", "Plano e cobrança"], ["pessoas", "Pessoas"], ["festas", "Festas"]] as const;

export default async function AdminBuffetPage({ params, searchParams }: PageProps<"/admin/buffets/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams, requireAdmin()]);
  const tab = typeof sp.aba === "string" && TABS.some(([k]) => k === sp.aba) ? sp.aba : "geral";
  const admin = createAdminClient();
  const [{ data: org }, { data: bill }, { data: stat }, { data: members }, { data: recentEvents }] = await Promise.all([
    admin.from("organizations").select("*").eq("id", id).maybeSingle(),
    admin.from("organization_billing").select("cycle_start, due_at, status, monthly_price, auto_billing, provider_customer_id, provider_subscription_id").eq("organization_id", id).maybeSingle(),
    admin.from("admin_org_stats").select("*").eq("organization_id", id).maybeSingle(),
    admin.from("profiles").select("id, name, email, role, created_at, is_platform_admin").eq("organization_id", id).order("role").order("name"),
    admin.from("events").select("id, title, starts_at, status, origin, customers(name)").eq("organization_id", id).order("created_at", { ascending: false }).limit(8),
  ]);
  if (!org) notFound();

  const since30 = daysAgoIso(30);
  const count = { count: "exact", head: true } as const;
  const [req30, quotes, closed, customers, signIns] = await Promise.all([
    admin.from("public_requests").select("id", count).eq("organization_id", id).gte("created_at", since30),
    admin.from("quotes").select("id", count).eq("organization_id", id),
    admin.from("events").select("id", count).eq("organization_id", id).in("status", ["CONFIRMED", "DONE"]),
    admin.from("customers").select("id", count).eq("organization_id", id),
    Promise.all((members ?? []).map((m) => admin.auth.admin.getUserById(m.id).then(({ data }) => [m.id, data.user?.last_sign_in_at ?? null] as const))),
  ]);
  const signInById = new Map(signIns);
  const activity = await orgLastActivity(admin, id, [...signInById.values()]);
  const lastSource = Object.entries(activity.sources).find(([, at]) => at && activity.at && new Date(at).getTime() === new Date(activity.at).getTime())?.[0];
  const idle = isIdle(activity.at, org.created_at);

  return (
    <>
      <PageHeader title={org.name} subtitle={`/p/${org.slug}`} back="/admin/buffets" action={
        <div className="flex items-center gap-3">
          <Link href={`/p/${org.slug}`} target="_blank" className="text-sm text-brand font-medium inline-flex items-center gap-1">Página pública <ExternalLink className="h-3.5 w-3.5" /></Link>
          <Link href={`/admin/buffets/${org.id}/ver`} className={buttonClass("outline", "sm")}><Eye className="h-4 w-4" /> Ver como este buffet</Link>
        </div>
      } />
      <PageBody>
        {sp.created ? <Alert tone="success">Buffet criado. O responsável recebeu o e-mail de boas-vindas para criar a senha.</Alert> : null}
        {org.is_demo ? <Alert tone="info">Buffet de demonstração: recriado toda noite por <code>app.reset_demo_buffet()</code>. Não é cobrado nem suspenso, e fica fora dos números da plataforma.</Alert> : null}
        <div>
        <BrowserTabs label="Seções do buffet" active={tab} tabs={TABS.map(([key, label]) => ({ key, label: key === "pessoas" ? `${label} · ${members?.length ?? 0}` : label, href: `/admin/buffets/${org.id}${key === "geral" ? "" : `?aba=${key}`}` }))} />
        <BrowserTabPanel>
        {tab === "geral" ? (
          <>
        <div className={idle ? "rounded-2xl border border-amber-200 bg-amber-50/60 p-4 flex items-center justify-between gap-3" : "rounded-2xl border border-border bg-surface p-4 flex items-center justify-between gap-3"}>
          <div>
            <p className="text-xs text-muted">Última atividade</p>
            <p className="font-semibold mt-0.5">{activity.at ? formatDateTime(activity.at) : "Nenhuma atividade ainda"}</p>
            {lastSource ? <p className="text-xs text-muted">{SOURCE_LABEL[lastSource]}</p> : null}
          </div>
          {idle ? <Badge tone="amber">parado · mais de {IDLE_DAYS} dias</Badge> : <Badge tone="green">ativo</Badge>}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ["Eventos", `${stat?.events_total ?? 0}`, `${stat?.events_30d ?? 0} nos últimos 30 dias`],
            ["Pedidos (30 dias)", `${req30.count ?? 0}`, `${stat?.requests_total ?? 0} no total, da página pública`],
            ["Orçamentos", `${quotes.count ?? 0}`, `${stat?.self_service_events ?? 0} reservas online`],
            ["Festas fechadas", `${closed.count ?? 0}`, "confirmadas ou realizadas"],
            ["Pagamentos", formatCurrency(stat?.payments_total ?? 0), "registrados no app"],
            ["Clientes", `${customers.count ?? 0}`, "cadastrados"],
            ["Equipe", `${members?.length ?? 0}`, "pessoas com acesso"],
            ["Último evento", stat?.last_event_at ? formatDate(stat.last_event_at) : "—", "data da festa mais recente"],
          ].map(([t, v, h]) => (
            <div key={t} className="rounded-2xl border border-border bg-surface p-4"><p className="text-xs text-muted">{t}</p><p className="text-xl font-semibold mt-1">{v}</p><p className="text-xs text-muted">{h}</p></div>
          ))}
        </div>

        <Card>
          <CardHeader title="Links úteis" />
          <CardBody className="text-sm space-y-1 text-muted">
            <p>Página pública: <a className="text-brand" href={appUrl(`/p/${org.slug}`)} target="_blank" rel="noopener">{appUrl(`/p/${org.slug}`)}</a></p>
            <p><Link className="text-brand" href={`/admin/buffets/${org.id}/ver`}>Ver como este buffet</Link> (somente leitura)</p>
            <p>Orçamento self-service: <a className="text-brand" href={appUrl(`/p/${org.slug}/orcamento`)} target="_blank" rel="noopener">{appUrl(`/p/${org.slug}/orcamento`)}</a></p>
            <p>Criado em {formatDateTime(org.created_at)} · WhatsApp {org.whatsapp ?? "—"} · Pix {org.pix_key ?? "não configurado"}</p>
          </CardBody>
        </Card>
          </>
        ) : null}
        {tab === "dados" ? (
          <>
        <OrgDataCard org={org} ownerEmail={(members ?? []).find((m) => m.role === "owner")?.email ?? null} bill={bill} />
          </>
        ) : null}
        {tab === "plano" ? (
          <>
        <Card>
          <CardHeader title="Plano, status, cobrança e endereço" subtitle="Só o Komyx altera. Suspender bloqueia o app e a página pública; os dados ficam guardados. O ciclo de cobrança aparece para o dono com barra de progresso." />
          <CardBody><OrgAdminForm org={{ id: org.id, slug: org.slug, plan: org.plan, status: org.status, notes: org.notes, billing_cycle_start: bill?.cycle_start ?? null, billing_due_at: bill?.due_at ?? null, billing_status: bill?.status ?? "ok" }} /></CardBody>
        </Card>

          </>
        ) : null}
        {tab === "pessoas" ? (
          <>
        <Card>
          <CardHeader title="Pessoas" subtitle="Responsável (owner) e equipe. O e-mail de senha leva um link para a pessoa criar uma nova." />
          <CardBody className="space-y-4">
            <ul className="divide-y divide-border">
              {(members ?? []).map((m) => (
                <li key={m.id} className="py-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0"><p className="font-medium truncate">{m.name} {m.is_platform_admin ? <Badge tone="amber" className="ml-1">admin komyx</Badge> : null}</p><p className="text-xs text-muted truncate">{m.email} · desde {formatDate(m.created_at)} · último acesso {signInById.get(m.id) ? formatDateTime(signInById.get(m.id)!) : "nunca"}</p></div>
                    <div className="flex items-center gap-2">
                      <Badge tone={m.role === "owner" ? "brand" : "zinc"}>{m.role === "owner" ? "Responsável" : "Equipe"}</Badge>
                      <form action={adminSetRole}><input type="hidden" name="user_id" value={m.id} /><input type="hidden" name="org_id" value={org.id} /><input type="hidden" name="role" value={m.role === "owner" ? "staff" : "owner"} /><PendingButton className="text-xs text-muted hover:text-foreground">{m.role === "owner" ? "Tornar equipe" : "Tornar responsável"}</PendingButton></form>
                    </div>
                  </div>
                  <SendResetForm userId={m.id} orgId={org.id} />
                  {emailIsLogged() ? <AccessLinkForm userId={m.id} /> : null}
                  <ResetPasswordForm userId={m.id} orgId={org.id} />
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

          </>
        ) : null}
        {tab === "festas" ? (
          <>
        <Card>
          <CardHeader title="Eventos recentes" />
          <CardBody>
            {recentEvents && recentEvents.length ? (
              <ul className="divide-y divide-border text-sm">
                {recentEvents.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="truncate">{e.title?.trim() || (e.customers ? `Festa de ${e.customers.name}` : "Evento")} · {formatDateTime(e.starts_at)}</span>
                    <span className="flex gap-1"><Badge tone="zinc">{e.status}</Badge>{e.origin === "SELF_SERVICE" ? <Badge tone="brand">online</Badge> : null}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">Nenhum evento ainda.</p>}
          </CardBody>
        </Card>

          </>
        ) : null}
        </BrowserTabPanel>
        </div>
      </PageBody>
    </>
  );
}

type OrgRow = Record<string, unknown> & { id: string; slug: string; name: string };

/** Every field the buffet has, filled or not ("—" when empty), so the admin sees the full record. */
function OrgDataCard({ org, ownerEmail, bill }: { org: OrgRow; ownerEmail: string | null; bill: Record<string, unknown> | null }) {
  const v = (x: unknown) => (x === null || x === undefined || x === "" || (Array.isArray(x) && x.length === 0) ? null : x);
  const text = (x: unknown) => { const y = v(x); return y === null ? "—" : String(y); };
  const yes = (x: unknown) => (x === null || x === undefined ? "—" : x ? "Sim" : "Não");
  const date = (x: unknown) => (v(x) ? formatDate(String(x)) : "—");
  const dateTime = (x: unknown) => (v(x) ? formatDateTime(String(x)) : "—");
  const count = (x: unknown) => (Array.isArray(x) ? `${x.length} ${x.length === 1 ? "item" : "itens"}` : "—");
  const phone = typeof org.whatsapp === "string" && org.whatsapp ? org.whatsapp : null;
  const sections: { title: string; rows: [string, React.ReactNode][] }[] = [
    { title: "Empresa", rows: [
      ["Nome", text(org.name)],
      ["Razão social", text(org.legal_name)],
      ["CNPJ / CPF", text(org.document)],
      ["WhatsApp", phone ? <a href={whatsappLink(phone)} target="_blank" rel="noopener" className="text-brand hover:underline">{formatPhone(phone)}</a> : "—"],
      ["E-mail do responsável", ownerEmail ? <a href={`mailto:${ownerEmail}`} className="text-brand hover:underline">{ownerEmail}</a> : "—"],
      ["Endereço", text(org.address)],
      ["Cidade", text(org.city)],
      ["Instagram", text(org.instagram)],
      ["Fundado em", text(org.founded_year)],
      ["Capacidade", v(org.capacity) ? `${org.capacity} pessoas` : "—"],
      ["Chave Pix", text(org.pix_key)],
    ] },
    { title: "Página pública", rows: [
      ["Endereço", <a key="p" href={`/p/${org.slug}`} target="_blank" rel="noopener" className="text-brand hover:underline">/p/{org.slug}</a>],
      ["Página no ar", yes(org.public_page)],
      ["Aparece no Google", yes(org.seo_listed)],
      ["Reserva online", yes(org.self_booking_enabled)],
      ["Mostra preços", yes(org.show_prices_public)],
      ["Uma festa por dia", yes(org.one_event_per_day)],
      ["Estilo do topo", text(org.hero_style)],
      ["Frase", text(org.tagline)],
      ["Descrição", text(org.description)],
      ["Destaques", count(org.highlights)],
      ["Galeria", count(org.gallery)],
      ["Depoimentos", count(org.testimonials)],
      ["Logo", v(org.logo_url) ? <a key="l" href={String(org.logo_url)} target="_blank" rel="noopener" className="text-brand hover:underline">ver</a> : "—"],
      ["Capa", v(org.cover_url) ? <a key="c" href={String(org.cover_url)} target="_blank" rel="noopener" className="text-brand hover:underline">ver</a> : "—"],
    ] },
    { title: "Festas e reservas", rows: [
      ["Duração padrão", v(org.default_event_duration_minutes) ? `${org.default_event_duration_minutes} min` : "—"],
      ["Validade da reserva", v(org.pre_reservation_validity_hours) ? `${org.pre_reservation_validity_hours} h` : "—"],
      ["Plano de pagamento", count(org.payment_plan)],
      ["Contrato próprio", v(org.contract_template) ? "Sim" : "Não"],
    ] },
    { title: "Cobrança Komyx", rows: [
      ["Plano", text(org.plan)],
      ["Situação", text(bill?.status)],
      ["Mensalidade", v(bill?.monthly_price) ? formatCurrency(Number(bill?.monthly_price)) : "preço do plano"],
      ["Início do ciclo", date(bill?.cycle_start)],
      ["Vencimento", date(bill?.due_at)],
      ["Cobrança automática", yes(bill?.auto_billing ?? false)],
      ["Cliente no Asaas", text(bill?.provider_customer_id)],
      ["Assinatura no Asaas", text(bill?.provider_subscription_id)],
    ] },
    { title: "Sistema", rows: [
      ["ID", <code key="id" className="text-xs">{org.id}</code>],
      ["Tipo", text(org.kind)],
      ["Status", text(org.status)],
      ["Demonstração", yes(org.is_demo)],
      ["Criado em", dateTime(org.created_at)],
      ["Atualizado em", dateTime(org.updated_at)],
      ["Cancelado em", dateTime(org.cancelled_at)],
      ["Motivo do cancelamento", text(org.cancel_reason)],
      ["Acesso até", date(org.access_until)],
    ] },
  ];
  return (
    <Card>
      <CardHeader title="Dados do buffet" subtitle="Tudo o que está cadastrado; — = não preenchido" />
      <CardBody className="grid gap-6 md:grid-cols-2">
        {sections.map((sec) => (
          <div key={sec.title}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">{sec.title}</p>
            <dl className="divide-y divide-border text-sm">
              {sec.rows.map(([k, val]) => (
                <div key={k} className="flex justify-between gap-4 py-1.5">
                  <dt className="text-muted shrink-0">{k}</dt>
                  <dd className={`text-right break-words min-w-0 ${val === "—" ? "text-stone-400" : ""}`}>{val}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
