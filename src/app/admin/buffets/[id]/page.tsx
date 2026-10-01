import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminSetRole } from "@/lib/actions/admin";
import { PageBody, PageHeader, Alert } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { appUrl, formatCurrency, formatDateTime } from "@/lib/utils";
import { OrgAdminForm, ResetPasswordForm } from "./forms";

export const dynamic = "force-dynamic";

export default async function AdminBuffetPage({ params, searchParams }: PageProps<"/admin/buffets/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const admin = createAdminClient();
  const [{ data: org }, { data: stat }, { data: members }, { data: recentEvents }] = await Promise.all([
    admin.from("organizations").select("*").eq("id", id).maybeSingle(),
    admin.from("admin_org_stats").select("*").eq("organization_id", id).maybeSingle(),
    admin.from("profiles").select("id, name, email, role, created_at, is_platform_admin").eq("organization_id", id).order("role").order("name"),
    admin.from("events").select("id, title, starts_at, status, origin, customers(name)").eq("organization_id", id).order("created_at", { ascending: false }).limit(8),
  ]);
  if (!org) notFound();

  return (
    <>
      <PageHeader title={org.name} subtitle={`/p/${org.slug}`} back="/admin/buffets" action={<Link href={`/p/${org.slug}`} target="_blank" className="text-sm text-brand font-medium inline-flex items-center gap-1">Página pública <ExternalLink className="h-3.5 w-3.5" /></Link>} />
      <PageBody>
        {sp.created ? <Alert tone="success">Buffet criado. Envie e-mail e senha ao responsável.</Alert> : null}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ["Eventos", `${stat?.events_total ?? 0}`, `${stat?.events_30d ?? 0} nos últimos 30 dias`],
            ["Reservas online", `${stat?.self_service_events ?? 0}`, "feitas pelo cliente"],
            ["Solicitações", `${stat?.requests_total ?? 0}`, "da página pública"],
            ["Pagamentos", formatCurrency(stat?.payments_total ?? 0), stat?.last_event_at ? `último evento ${formatDateTime(stat.last_event_at)}` : "sem eventos"],
          ].map(([t, v, h]) => (
            <div key={t} className="rounded-2xl border border-border bg-surface p-4"><p className="text-xs text-muted">{t}</p><p className="text-xl font-semibold mt-1">{v}</p><p className="text-xs text-muted">{h}</p></div>
          ))}
        </div>

        <Card>
          <CardHeader title="Plano, status, cobrança e endereço" subtitle="Só o Festeja altera. Suspender bloqueia o app e a página pública; os dados ficam guardados. O ciclo de cobrança aparece para o dono com barra de progresso." />
          <CardBody><OrgAdminForm org={{ id: org.id, slug: org.slug, plan: org.plan, status: org.status, notes: org.notes, billing_cycle_start: org.billing_cycle_start, billing_due_at: org.billing_due_at, billing_status: org.billing_status }} /></CardBody>
        </Card>

        <Card>
          <CardHeader title="Pessoas" subtitle="Responsável (owner) e equipe" />
          <CardBody className="space-y-4">
            <ul className="divide-y divide-border">
              {(members ?? []).map((m) => (
                <li key={m.id} className="py-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0"><p className="font-medium truncate">{m.name} {m.is_platform_admin ? <Badge tone="amber" className="ml-1">admin festeja</Badge> : null}</p><p className="text-xs text-muted truncate">{m.email} · desde {formatDateTime(m.created_at)}</p></div>
                    <div className="flex items-center gap-2">
                      <Badge tone={m.role === "owner" ? "brand" : "zinc"}>{m.role === "owner" ? "Responsável" : "Equipe"}</Badge>
                      <form action={adminSetRole}><input type="hidden" name="user_id" value={m.id} /><input type="hidden" name="org_id" value={org.id} /><input type="hidden" name="role" value={m.role === "owner" ? "staff" : "owner"} /><button className="text-xs text-muted hover:text-foreground">{m.role === "owner" ? "Tornar equipe" : "Tornar responsável"}</button></form>
                    </div>
                  </div>
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
            <p>Orçamento self-service: <a className="text-brand" href={appUrl(`/p/${org.slug}/orcamento`)} target="_blank" rel="noopener">{appUrl(`/p/${org.slug}/orcamento`)}</a></p>
            <p>Criado em {formatDateTime(org.created_at)} · WhatsApp {org.whatsapp ?? "—"} · Pix {org.pix_key ?? "não configurado"}</p>
          </CardBody>
        </Card>
      </PageBody>
    </>
  );
}
