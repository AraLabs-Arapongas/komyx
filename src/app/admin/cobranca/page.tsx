import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminVoidInvoice } from "@/lib/actions/admin-billing";
import { PageBody, PageHeader, EmptyState } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PendingButton } from "@/components/ui/pending-button";
import { BILLING_STATUS_LABEL, PLAN_LABEL } from "@/lib/billing";
import { INVOICE_VIEW_LABEL, INVOICE_VIEW_TONE, PAYMENT_METHOD_LABEL, effectivePrice, invoiceView, moneyInput, nextPeriod, type InvoiceView } from "@/lib/billing/invoices";
import { formatCurrency, formatDate, toDateKey } from "@/lib/utils";
import { AutoBillingForm, MarkPaidForm, NewInvoiceForm, PriceForm, RefundDoneButton, StatusFilter } from "./forms";
import { lateState, planName } from "@/lib/billing/plans";
import { billingProviderInfo } from "@/lib/billing/provider";

export const metadata = { title: "Cobrança · Admin Komyx" };
export const dynamic = "force-dynamic";

const FILTER_VIEW: Record<string, InvoiceView> = { aberta: "open", vencida: "overdue", paga: "paid", cancelada: "void" };
const BILLING_TONE: Record<string, "green" | "amber" | "red" | "brand"> = { ok: "green", due: "amber", overdue: "red", trial: "brand" };
const ORG_STATUS: Record<string, [string, "green" | "red" | "zinc"]> = { active: ["ativo", "green"], suspended: ["suspenso", "red"], cancelled: ["cancelado", "zinc"] };

const REFUND_LABEL: Record<string, string> = { requested: "Pedido ao Asaas", manual: "Pagar por Pix", done: "Feito", cancelled: "Cancelado" };
const REFUND_TONE: Record<string, "amber" | "red" | "green" | "zinc"> = { requested: "amber", manual: "red", done: "green", cancelled: "zinc" };
const day = (d: string) => formatDate(`${d}T12:00:00-03:00`);

export default async function AdminBillingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const filter = typeof sp.status === "string" && sp.status in FILTER_VIEW ? sp.status : "todas";
  const today = toDateKey(new Date());
  const month = today.slice(0, 7);
  const admin = createAdminClient();
  const [{ data: orgRows }, { data: billRows }, { data: invRows }, { data: refundRows }] = await Promise.all([
    admin.from("organizations").select("id, name, slug, plan, status, is_demo").eq("kind", "buffet").order("name"),
    admin.from("organization_billing").select("organization_id, cycle_start, due_at, status, monthly_price, auto_billing, billing_period, pending_period, pending_from, paused_at"),
    // Small table (one row per buffet per month): read it whole for the cards and "last invoice".
    admin.from("billing_invoices").select("id, organization_id, period_start, period_end, amount, due_at, status, paid_at, method, notes, provider, payment_url").order("due_at", { ascending: false }).order("created_at", { ascending: false }).limit(5000),
    admin.from("billing_refunds").select("id, organization_id, amount, reason, status, method, error, created_at, done_at").order("created_at", { ascending: false }).limit(50),
  ]);
  const orgs = (orgRows ?? []).filter((o) => !o.is_demo);
  const demos = (orgRows ?? []).length - orgs.length;
  const orgById = new Map(orgs.map((o) => [o.id, o]));
  const billByOrg = new Map((billRows ?? []).map((b) => [b.organization_id, b]));
  const invoices = (invRows ?? []).filter((i) => orgById.has(i.organization_id));

  // Open invoices past due flip the buffet's billing to 'overdue' (idempotent; only rows that change).
  const overdueOrgs = [...new Set(invoices.filter((i) => invoiceView(i, today) === "overdue").map((i) => i.organization_id))];
  const toFlip = overdueOrgs.filter((id) => billByOrg.get(id)?.status !== "overdue");
  if (toFlip.length) {
    await admin.from("organization_billing").update({ status: "overdue", updated_at: new Date().toISOString() }).in("organization_id", toFlip);
    for (const id of toFlip) { const b = billByOrg.get(id); if (b) b.status = "overdue"; }
  }

  const provider = billingProviderInfo();
  const priceOf = (o: { id: string; plan: string }) => effectivePrice(billByOrg.get(o.id)?.monthly_price, o.plan);
  const mrr = orgs.filter((o) => o.status === "active" && billByOrg.get(o.id)?.status !== "trial").reduce((a, o) => a + priceOf(o), 0);
  const sum = (list: { amount: number }[]) => list.reduce((a, i) => a + Number(i.amount), 0);
  const open = invoices.filter((i) => i.status === "open");
  const overdue = open.filter((i) => i.due_at < today);
  const paidMonth = invoices.filter((i) => i.status === "paid" && i.paid_at?.startsWith(month));

  const lastByOrg = new Map<string, (typeof invoices)[number]>();
  const lastEndByOrg = new Map<string, string>();
  for (const i of invoices) {
    if (!lastByOrg.has(i.organization_id)) lastByOrg.set(i.organization_id, i);
    if (i.status !== "void" && i.period_end > (lastEndByOrg.get(i.organization_id) ?? "")) lastEndByOrg.set(i.organization_id, i.period_end);
  }
  const situation = (orgId: string) => {
    const b = billByOrg.get(orgId);
    if (!b) return null;
    return { paused: Boolean(b.paused_at), late: lateState(b, open.filter((i) => i.organization_id === orgId), today) };
  };
  const refunds = (refundRows ?? []).filter((r) => orgById.has(r.organization_id));
  const listed = (filter === "todas" ? invoices : invoices.filter((i) => invoiceView(i, today) === FILTER_VIEW[filter])).slice(0, 100);

  return (
    <>
      <PageHeader title="Cobrança" subtitle={provider.id === "asaas" ? `Provedor: ${provider.label}. Com a cobrança automática ligada, o Asaas cobra todo mês e a baixa é sozinha` : "Faturas manuais: a Komyx envia o Pix pelo WhatsApp e marca aqui quando recebe. Configure o Asaas para cobrar sozinho"} />
      <PageBody>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ["Receita mensal estimada", formatCurrency(mrr), "buffets ativos fora do teste"],
            ["Faturas em aberto", formatCurrency(sum(open)), `${open.length} fatura${open.length === 1 ? "" : "s"}`],
            ["Vencidas", formatCurrency(sum(overdue)), `${overdue.length} fatura${overdue.length === 1 ? "" : "s"}`],
            ["Recebido no mês", formatCurrency(sum(paidMonth)), `${paidMonth.length} pagamento${paidMonth.length === 1 ? "" : "s"}`],
          ].map(([t, v, h]) => (
            <div key={t} className="rounded-2xl border border-border bg-surface p-4"><p className="text-xs text-muted">{t}</p><p className="text-2xl font-semibold mt-1">{v}</p><p className="text-xs text-muted">{h}</p></div>
          ))}
        </div>

        <Card>
          <CardHeader title="Buffets" subtitle={`${orgs.length} cobrados${demos ? ` · ${demos} demo${demos === 1 ? "" : "s"} fora da cobrança` : ""} · mensalidade vazia = preço do plano`} />
          <CardBody className="overflow-x-auto">
            {orgs.length ? (
              <table className="w-full text-sm">
                <thead className="text-xs text-muted text-left border-b border-border">
                  <tr><th className="py-2 pr-2">Buffet</th><th className="px-2 py-2">Plano</th><th className="px-2 py-2">Cobrança</th><th className="px-2 py-2">Vencimento</th><th className="px-2 py-2">Mensalidade</th><th className="px-2 py-2">Última fatura</th><th className="px-2 py-2">Automática</th><th className="px-2 py-2"></th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orgs.map((o) => {
                    const b = billByOrg.get(o.id);
                    const last = lastByOrg.get(o.id);
                    const next = nextPeriod(b, lastEndByOrg.get(o.id) ?? null, today);
                    const [stLabel, stTone] = ORG_STATUS[o.status] ?? [o.status, "zinc"];
                    return (
                      <tr key={o.id} className="align-top" data-org={o.slug}>
                        <td className="py-2.5 pr-2"><Link href={`/admin/buffets/${o.id}`} className="font-medium hover:underline">{o.name}</Link><p className="text-xs text-muted">/p/{o.slug}</p></td>
                        <td className="px-2 py-2.5"><div className="flex gap-1"><Badge tone={o.plan === "premium" ? "brand" : "zinc"}>{PLAN_LABEL[o.plan] ?? o.plan}</Badge>{o.status !== "active" ? <Badge tone={stTone}>{stLabel}</Badge> : null}</div>{b ? <p className="text-xs text-muted mt-1 whitespace-nowrap">{planName(b.billing_period)}{b.pending_period && b.pending_from ? ` → ${planName(b.pending_period)} em ${day(b.pending_from)}` : ""}</p> : null}</td>
                        <td className="px-2 py-2.5">{(() => { const st = situation(o.id); return st?.paused ? <Badge tone="red">Pausado</Badge> : st?.late && st.late.day >= 1 ? <Badge tone="red">Atrasado {st.late.day} dia{st.late.day === 1 ? "" : "s"}</Badge> : b ? <Badge tone={BILLING_TONE[b.status] ?? "zinc"}>{BILLING_STATUS_LABEL[b.status] ?? b.status}</Badge> : <span className="text-xs text-muted">—</span>; })()}</td>
                        <td className="px-2 py-2.5 whitespace-nowrap">{b?.due_at ? day(b.due_at) : "—"}{b?.status === "trial" ? <p className="text-xs text-muted">fim do teste</p> : null}</td>
                        <td className="px-2 py-2.5"><PriceForm orgId={o.id} value={moneyInput(b?.monthly_price)} fallback={moneyInput(priceOf({ id: "", plan: o.plan }))} /></td>
                        <td className="px-2 py-2.5 whitespace-nowrap">{last ? <>{formatCurrency(last.amount)} <Badge tone={INVOICE_VIEW_TONE[invoiceView(last, today)]}>{INVOICE_VIEW_LABEL[invoiceView(last, today)]}</Badge><p className="text-xs text-muted">vence {day(last.due_at)}</p></> : <span className="text-xs text-muted">nenhuma</span>}</td>
                        <td className="px-2 py-2.5"><AutoBillingForm orgId={o.id} on={Boolean(b?.auto_billing)} available={provider.id === "asaas"} /></td>
                        {/* With the Asaas subscription on, it creates each month's invoice: a manual one would charge twice. */}
                        <td className="px-2 py-2.5 text-right">{b?.auto_billing ? <span className="text-xs text-muted">a assinatura gera as faturas</span> : <NewInvoiceForm orgId={o.id} start={next.start} end={next.end} due={next.due} amount={moneyInput(priceOf(o))} />}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : <p className="text-sm text-muted">Nenhum buffet cobrado ainda.</p>}
          </CardBody>
        </Card>

        {refunds.length ? (
          <Card id="reembolsos">
            <CardHeader title="Reembolsos" subtitle="Cancelamentos com devolução. Pelo Asaas quando dá; boleto (ou recusa do Asaas) a Komyx paga por Pix e marca aqui." />
            <CardBody className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted text-left border-b border-border">
                  <tr><th className="py-2 pr-2">Buffet</th><th className="px-2 py-2">Motivo</th><th className="px-2 py-2 text-right">Valor</th><th className="px-2 py-2">Situação</th><th className="px-2 py-2"></th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {refunds.map((r) => (
                    <tr key={r.id} data-refund={r.id} className="align-top">
                      <td className="py-2.5 pr-2"><Link href={`/admin/buffets/${r.organization_id}?aba=plano`} className="font-medium hover:underline">{orgById.get(r.organization_id)?.name ?? "—"}</Link><p className="text-xs text-muted">{formatDate(r.created_at)}</p></td>
                      <td className="px-2 py-2.5 text-xs">{r.reason === "full_7_days" ? "Integral (até 7 dias)" : "Proporcional (pago − meses × R$ 149)"}</td>
                      <td className="px-2 py-2.5 text-right whitespace-nowrap">{formatCurrency(r.amount)}</td>
                      <td className="px-2 py-2.5"><Badge tone={REFUND_TONE[r.status] ?? "zinc"}>{REFUND_LABEL[r.status] ?? r.status}</Badge>{r.error ? <p className="text-xs text-muted max-w-56">{r.error}</p> : null}{r.done_at ? <p className="text-xs text-muted">{formatDate(r.done_at)}{r.method ? ` · ${r.method === "pix" ? "Pix" : "Asaas"}` : ""}</p> : null}</td>
                      <td className="px-2 py-2.5 text-right">{r.status === "manual" ? <RefundDoneButton id={r.id} label={`Reembolsar ${formatCurrency(r.amount)} por Pix`} /> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>
        ) : null}

        <Card id="faturas">
          <CardHeader title="Faturas" subtitle={listed.length === 100 ? "As 100 mais recentes" : `${listed.length} na lista`} action={<StatusFilter value={filter} />} />
          <CardBody className="overflow-x-auto">
            {listed.length ? (
              <table className="w-full text-sm">
                <thead className="text-xs text-muted text-left border-b border-border">
                  <tr><th className="py-2 pr-2">Buffet</th><th className="px-2 py-2">Período</th><th className="px-2 py-2 text-right">Valor</th><th className="px-2 py-2">Vencimento</th><th className="px-2 py-2">Status</th><th className="px-2 py-2"></th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {listed.map((i) => {
                    const v = invoiceView(i, today);
                    const org = orgById.get(i.organization_id);
                    return (
                      <tr key={i.id} className="align-top" data-invoice={i.id}>
                        <td className="py-2.5 pr-2"><Link href={`/admin/buffets/${i.organization_id}`} className="font-medium hover:underline">{org?.name ?? "—"}</Link>{i.notes ? <p className="text-xs text-muted">{i.notes}</p> : null}</td>
                        <td className="px-2 py-2.5 whitespace-nowrap text-xs">{day(i.period_start)} a {day(i.period_end)}</td>
                        <td className="px-2 py-2.5 text-right whitespace-nowrap">{formatCurrency(i.amount)}</td>
                        <td className="px-2 py-2.5 whitespace-nowrap">{day(i.due_at)}</td>
                        <td className="px-2 py-2.5"><Badge tone={INVOICE_VIEW_TONE[v]}>{INVOICE_VIEW_LABEL[v]}</Badge>{i.provider === "asaas" ? <> <Badge tone="slate">Asaas</Badge></> : null}{i.payment_url && i.status === "open" ? <a href={i.payment_url} target="_blank" rel="noopener" className="block text-xs text-brand hover:underline">ver cobrança</a> : null}{i.status === "paid" && i.paid_at ? <p className="text-xs text-muted whitespace-nowrap">{day(i.paid_at)}{i.method ? ` · ${PAYMENT_METHOD_LABEL[i.method] ?? i.method}` : ""}</p> : null}</td>
                        <td className="px-2 py-2.5 text-right">
                          {i.status === "open" ? (
                            <div className="flex flex-col items-end gap-1.5">
                              <MarkPaidForm id={i.id} today={today} />
                              <form action={adminVoidInvoice}><input type="hidden" name="id" value={i.id} /><PendingButton className="text-xs text-muted hover:text-red-600">Cancelar</PendingButton></form>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : <EmptyState title="Nenhuma fatura" description={filter === "todas" ? "Gere a primeira fatura na lista de buffets." : "Nenhuma fatura com este status."} />}
          </CardBody>
        </Card>
      </PageBody>
    </>
  );
}
