import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Eye } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/data/session";
import { adminSetRole } from "@/lib/actions/admin";
import { PageBody, PageHeader, Alert } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { appUrl, formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { buttonClass } from "@/components/ui/button";
import { OrgAdminForm, ResetPasswordForm, SendResetForm } from "./forms";
import { PendingButton } from "@/components/ui/pending-button";
import { IDLE_DAYS, daysAgoIso, isIdle, orgLastActivity } from "../activity";

const SOURCE_LABEL: Record<string, string> = { evento: "evento alterado", pedido: "pedido na página pública", pagamento: "pagamento registrado", login: "login da equipe" };

export const dynamic = "force-dynamic";

export default async function AdminBuffetPage({ params, searchParams }: PageProps<"/admin/buffets/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams, requireAdmin()]);
  const admin = createAdminClient();
  const [{ data: org }, { data: bill }, { data: stat }, { data: members }, { data: recentEvents }] = await Promise.all([
    admin.from("organizations").select("*").eq("id", id).maybeSingle(),
    admin.from("organization_billing").select("cycle_start, due_at, status").eq("organization_id", id).maybeSingle(),
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
        {sp.created ? <Alert tone="success">Buffet criado. Envie e-mail e senha ao responsável.</Alert> : null}
        {org.is_demo ? <Alert tone="info">Buffet de demonstração: recriado toda noite por <code>app.reset_demo_buffet()</code>. Não é cobrado nem suspenso, e fica fora dos números da plataforma.</Alert> : null}
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
          <CardHeader title="Plano, status, cobrança e endereço" subtitle="Só o Komyx altera. Suspender bloqueia o app e a página pública; os dados ficam guardados. O ciclo de cobrança aparece para o dono com barra de progresso." />
          <CardBody><OrgAdminForm org={{ id: org.id, slug: org.slug, plan: org.plan, status: org.status, notes: org.notes, billing_cycle_start: bill?.cycle_start ?? null, billing_due_at: bill?.due_at ?? null, billing_status: bill?.status ?? "ok" }} /></CardBody>
        </Card>

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
                  <ResetPasswordForm userId={m.id} orgId={org.id} />
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

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

        <Card>
          <CardHeader title="Links úteis" />
          <CardBody className="text-sm space-y-1 text-muted">
            <p>Página pública: <a className="text-brand" href={appUrl(`/p/${org.slug}`)} target="_blank" rel="noopener">{appUrl(`/p/${org.slug}`)}</a></p>
            <p><Link className="text-brand" href={`/admin/buffets/${org.id}/ver`}>Ver como este buffet</Link> (somente leitura)</p>
            <p>Orçamento self-service: <a className="text-brand" href={appUrl(`/p/${org.slug}/orcamento`)} target="_blank" rel="noopener">{appUrl(`/p/${org.slug}/orcamento`)}</a></p>
            <p>Criado em {formatDateTime(org.created_at)} · WhatsApp {org.whatsapp ?? "—"} · Pix {org.pix_key ?? "não configurado"}</p>
          </CardBody>
        </Card>
      </PageBody>
    </>
  );
}
