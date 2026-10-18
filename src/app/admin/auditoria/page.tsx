import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/data/session";
import { PageBody, PageHeader, EmptyState } from "@/components/ui/page";
import { SelectMenu } from "@/components/ui/select-menu";
import { buttonClass } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Auditoria · Admin" };
export const dynamic = "force-dynamic";

/** Every action key written by logAdminAction, in pt-BR. Unknown keys show as the raw key. */
const ACTION_LABEL: Record<string, string> = {
  "org.create": "Criou buffet",
  "org.update": "Alterou buffet",
  "org.suspend": "Suspendeu buffet",
  "org.reactivate": "Reativou buffet",
  "org.plan": "Mudou o plano",
  "org.view_as": "Viu como o buffet",
  "user.admin_grant": "Deu acesso de admin",
  "user.admin_revoke": "Tirou acesso de admin",
  "user.password_reset": "Reenviou e-mail de senha",
  "user.password_set": "Definiu senha",
  "user.role": "Mudou o papel",
  "template.update": "Editou modelo de e-mail",
  "announcement.create": "Criou aviso",
  "announcement.update": "Editou aviso",
  "announcement.end": "Encerrou aviso",
  "announcement.email": "Enviou aviso por e-mail",
  "message.resend": "Reenviou mensagem",
  "invoice.create": "Criou fatura",
  "invoice.paid": "Marcou fatura como paga",
  "invoice.void": "Cancelou fatura",
  "billing.price": "Mudou a mensalidade",
};

const FIELD_LABEL: Record<string, string> = { plan: "plano", status: "status", slug: "slug", notes: "notas", billing_status: "cobrança", billing_cycle_start: "início do ciclo", billing_due_at: "vencimento" };

/** One line out of the details JSON: changes as "campo: antes → depois", else the most telling fields. */
function summarize(details: unknown): string {
  if (!details || typeof details !== "object") return "";
  const d = details as Record<string, unknown>;
  if (d.changes && typeof d.changes === "object") {
    return Object.entries(d.changes as Record<string, [unknown, unknown]>)
      .map(([k, v]) => (Array.isArray(v) ? `${FIELD_LABEL[k] ?? k}: ${v[0] ?? "—"} → ${v[1] ?? "—"}` : k))
      .join(" · ");
  }
  return Object.entries(d)
    .filter(([k, v]) => !k.endsWith("_id") && k !== "id" && v !== null && typeof v !== "object")
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(" · ");
}

export default async function AdminAuditPage({ searchParams }: PageProps<"/admin/auditoria">) {
  const [sp] = await Promise.all([searchParams, requireAdmin()]);
  const org = typeof sp.org === "string" ? sp.org : "";
  const action = typeof sp.action === "string" ? sp.action : "";
  const admin = createAdminClient();
  let query = admin.from("admin_audit").select("id, created_at, admin_email, action, organization_id, details").order("created_at", { ascending: false }).limit(200);
  if (/^[0-9a-f-]{36}$/.test(org)) query = query.eq("organization_id", org);
  if (action) query = query.eq("action", action);
  const [{ data: rows }, { data: orgs }] = await Promise.all([
    query,
    admin.from("organizations").select("id, name").eq("kind", "buffet").order("name"),
  ]);
  const orgName = new Map((orgs ?? []).map((o) => [o.id, o.name]));

  return (
    <>
      <PageHeader title="Auditoria" subtitle={`${rows?.length ?? 0} registros${rows?.length === 200 ? " (os 200 mais recentes)" : ""}`} />
      <PageBody>
        <form className="flex flex-wrap items-end gap-2">
          <SelectMenu name="org" aria-label="Buffet" defaultValue={org} className="w-64" options={[{ value: "", label: "Todos os buffets" }, ...(orgs ?? []).map((o) => ({ value: o.id, label: o.name }))]} />
          <SelectMenu name="action" aria-label="Ação" defaultValue={action} className="w-64" options={[{ value: "", label: "Todas as ações" }, ...Object.entries(ACTION_LABEL).map(([value, label]) => ({ value, label }))]} />
          <PendingButton className={buttonClass("outline", "md")}>Filtrar</PendingButton>
          {org || action ? <Link href="/admin/auditoria" className="text-sm text-muted hover:text-foreground px-2 py-2.5">Limpar</Link> : null}
        </form>
        {rows && rows.length ? (
          <div className="rounded-2xl border border-border bg-surface overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-xs text-muted text-left"><tr><th className="px-4 py-2">Quando</th><th className="px-2 py-2">Admin</th><th className="px-2 py-2">Ação</th><th className="px-2 py-2">Buffet</th><th className="px-2 py-2">Detalhes</th></tr></thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="px-4 py-2.5 whitespace-nowrap text-xs">{formatDateTime(r.created_at)}</td>
                    <td className="px-2 py-2.5 text-xs">{r.admin_email ?? "—"}</td>
                    <td className="px-2 py-2.5" title={r.action}>{ACTION_LABEL[r.action] ?? r.action}</td>
                    <td className="px-2 py-2.5">{r.organization_id ? <Link href={`/admin/buffets/${r.organization_id}`} className="hover:underline">{orgName.get(r.organization_id) ?? "Buffet"}</Link> : <span className="text-muted">—</span>}</td>
                    <td className="px-2 py-2.5 text-xs text-muted max-w-md break-words">{summarize(r.details) || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="Nada registrado" description={org || action ? "Nenhum registro com esses filtros." : "As ações dos admins aparecem aqui."} />}
      </PageBody>
    </>
  );
}
