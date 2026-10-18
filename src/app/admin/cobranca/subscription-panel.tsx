import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { subscriptionContext } from "@/lib/billing/subscription";
import { brDate, periodPrice, planName } from "@/lib/billing/plans";
import { formatCurrency } from "@/lib/utils";
import { RefundDoneButton } from "./forms";

/**
 * One buffet's subscription for the admin (docs/assinatura.md §7): plan, scheduled change, situation
 * (em dia / atrasado X dias / pausado), next charge and the Pix refund button. Meant for the
 * "Plano e cobrança" tab of /admin/buffets/[id]: <OrgSubscriptionPanel orgId={org.id} />.
 */
export async function OrgSubscriptionPanel({ orgId }: { orgId: string }) {
  const admin = createAdminClient();
  const [{ bill, late, open }, { data: refunds }, { data: notices }] = await Promise.all([
    subscriptionContext(admin, orgId),
    admin.from("billing_refunds").select("id, amount, reason, status, error, created_at, done_at, method").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(10),
    admin.from("billing_notices").select("overdue_since, day, email_status, created_at").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(8),
  ]);
  if (!bill) return null;
  const situation = bill.paused_at ? <Badge tone="red">Pausado desde {brDate(bill.paused_at.slice(0, 10))}</Badge>
    : late && late.day >= 1 ? <Badge tone="red">Atrasado {late.day} dia{late.day === 1 ? "" : "s"}</Badge>
    : bill.status === "trial" ? <Badge tone="brand">Período de teste</Badge> : <Badge tone="green">Em dia</Badge>;
  const nextCharge = open.map((i) => i.due_at).sort()[0] ?? bill.due_at;
  return (
    <Card data-testid="org-subscription">
      <CardHeader title="Assinatura" subtitle="Plano escolhido pelo dono, troca agendada, atraso e reembolsos." action={<Link href="/admin/cobranca" className="text-sm text-brand">Admin › Cobrança</Link>} />
      <CardBody className="space-y-4 text-sm">
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3">
          <div><dt className="text-xs text-muted">Plano</dt><dd className="font-medium">{planName(bill.billing_period)} · {formatCurrency(periodPrice(bill.billing_period, bill.monthly_price))}</dd></div>
          <div><dt className="text-xs text-muted">Troca agendada</dt><dd className="font-medium">{bill.pending_period && bill.pending_from ? `${planName(bill.pending_period)} a partir de ${brDate(bill.pending_from)}` : "—"}</dd></div>
          <div><dt className="text-xs text-muted">Situação</dt><dd>{situation}{late && late.day >= 1 && !bill.paused_at ? <span className="block text-xs text-muted">pausa em {brDate(late.pauseOn)}</span> : null}</dd></div>
          <div><dt className="text-xs text-muted">Próxima cobrança</dt><dd className="font-medium">{nextCharge ? brDate(nextCharge) : "—"}{bill.auto_billing ? <span className="block text-xs text-muted font-normal">assinatura Asaas ligada</span> : null}</dd></div>
        </dl>
        {notices?.length ? <p className="text-xs text-muted">Avisos de atraso: {notices.map((n) => `dia ${n.day} (${brDate(n.created_at.slice(0, 10))}${n.email_status !== "sent" ? `, e-mail ${n.email_status}` : ""})`).join(" · ")}</p> : null}
        {refunds?.length ? (
          <ul className="divide-y divide-border">
            {refunds.map((r) => (
              <li key={r.id} className="py-2 flex items-center justify-between gap-3">
                <span>Reembolso {r.reason === "full_7_days" ? "integral" : "proporcional"} de <b>{formatCurrency(r.amount)}</b> · {r.status === "done" ? `feito${r.done_at ? ` em ${brDate(r.done_at.slice(0, 10))}` : ""}` : r.status === "requested" ? "pedido ao Asaas" : "a pagar por Pix"}{r.error ? <span className="block text-xs text-muted">{r.error}</span> : null}</span>
                {r.status === "manual" ? <RefundDoneButton id={r.id} label={`Reembolsar ${formatCurrency(r.amount)} por Pix`} /> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </CardBody>
    </Card>
  );
}
