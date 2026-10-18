import { CreditCard, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, getOrganization, getBilling } from "@/lib/data/session";
import { PageBody, PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { formatCurrency, formatDate, toDateKey, whatsappLink } from "@/lib/utils";
import { BILLING_STATUS_LABEL, SUPPORT_WHATSAPP } from "@/lib/billing";
import { billingDataMissing, brDate, cancelOptions, daysBetween, isPeriodMonths, lateState, periodPrice, planOptions, PERIOD_LABEL, type PaidInvoice } from "@/lib/billing/plans";
import { PlanCard } from "./plan-card";
import { NameForm, PasswordForm, EmailNotificationsForm } from "./account-forms";
import { CancelSubscription, type CancelChoice } from "./cancel-subscription";
import { reactivateSubscription } from "@/lib/actions/subscription";
import { Alert } from "@/components/ui/page";
import { PendingButton } from "@/components/ui/pending-button";
import { billingProviderInfo } from "@/lib/billing/provider";
import { INVOICE_VIEW_LABEL, INVOICE_VIEW_TONE, invoiceView } from "@/lib/billing/invoices";

export const metadata = { title: "Minha conta" };

export default async function AccountPage({ searchParams }: PageProps<"/conta">) {
  const [profile, org, sp] = await Promise.all([requireProfile(), getOrganization(), searchParams]);
  const isOwner = profile.role === "owner";
  const bill = await getBilling(profile);
  const supabase = await createClient();
  const { data: prefs } = await supabase.from("profiles").select("email_notifications").eq("id", profile.id).single();
  // Komyx invoices (billing_invoices): RLS returns only this buffet's rows, and only to the owner.
  const [{ data: faturas }, { data: refundRows }] = isOwner ? await Promise.all([
    supabase.from("billing_invoices").select("id, period_start, period_end, amount, due_at, status, paid_at, payment_url, months").neq("status", "void").order("due_at", { ascending: false }).limit(24),
    supabase.from("billing_refunds").select("id, amount, status").neq("status", "cancelled").order("created_at", { ascending: false }).limit(3),
  ]) : [{ data: [] }, { data: [] }];
  const refunds = refundRows ?? [];
  const today = toDateKey(new Date());
  const period = isPeriodMonths(bill?.billing_period) ? bill.billing_period : 1;
  const price = periodPrice(period, bill?.monthly_price);
  const dayDate = (d: string) => formatDate(`${d}T12:00:00-03:00`);
  const support = (msg: string) => whatsappLink(SUPPORT_WHATSAPP, msg);
  const paid = (faturas ?? []).filter((f) => f.status === "paid" && f.paid_at).sort((a, b) => b.paid_at!.localeCompare(a.paid_at!));
  const neverPaid = paid.length === 0;
  const openInvoices = (faturas ?? []).filter((f) => f.status === "open").sort((a, b) => a.due_at.localeCompare(b.due_at));
  const late = lateState(bill, openInvoices, today);
  // The one to pay now: the oldest open invoice (the late one, or the next one already issued).
  const toPay = openInvoices[0] ?? null;
  const { choices, cancelSummary } = cancelCopy(bill?.due_at ?? null, paid[0] ? { ...paid[0], provider: "", external_id: null } : null, today, neverPaid);

  return (
    <>
      <PageHeader title="Minha conta" subtitle={`${profile.email} · ${isOwner ? "Proprietário" : "Equipe"} · ${org.name}`} back="/menu" />
      <PageBody>
        <Card id="perfil">
          <CardHeader title="Perfil" />
          <CardBody className="space-y-6">
            <NameForm name={profile.name} email={profile.email} />
            <div className="border-t border-border pt-4">
              <p className="text-sm font-medium mb-3">Alterar senha</p>
              <PasswordForm />
            </div>
            <div className="border-t border-border pt-4">
              <EmailNotificationsForm enabled={prefs?.email_notifications ?? true} />
            </div>
          </CardBody>
        </Card>

        {isOwner ? (
          <>
            <Card id="assinatura">
              <CardHeader title="Assinatura" subtitle="Cobrança do Komyx. Nada a ver com os pagamentos das festas." />
              <CardBody className="space-y-4">
                <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3 text-sm">
                  <div><dt className="text-xs text-muted">Plano</dt><dd className="font-medium">{PERIOD_LABEL[period]}</dd></div>
                  <div><dt className="text-xs text-muted">Valor</dt><dd className="font-medium">{formatCurrency(price)}<span className="text-xs text-muted font-normal">{period === 1 ? " por mês" : ` a cada ${period} meses`}</span></dd></div>
                  {late && late.day >= 1 ? (
                    <div><dt className="text-xs text-muted">Vencida em</dt><dd className="font-medium text-red-700">{dayDate(late.since)}</dd></div>
                  ) : (
                    <div><dt className="text-xs text-muted">{neverPaid && bill?.status === "trial" ? "Fim do teste grátis" : "Próxima cobrança"}</dt><dd className="font-medium">{toPay ? dayDate(toPay.due_at) : bill?.due_at ? dayDate(bill.due_at) : "—"}</dd></div>
                  )}
                  <div><dt className="text-xs text-muted">Situação</dt><dd>{org.status === "cancelled" ? <Badge tone="red">Cancelada</Badge> : late && late.day >= 1 ? <Badge tone="red">Atrasada {late.day} dia{late.day === 1 ? "" : "s"}</Badge> : <Badge tone={bill?.status === "trial" ? "brand" : "green"}>{BILLING_STATUS_LABEL[bill?.status === "overdue" ? "ok" : bill?.status ?? "ok"] ?? bill?.status}</Badge>}</dd></div>
                </dl>
                {toPay && org.status !== "cancelled" ? (
                  <div data-testid="pay-invoice" className={late && late.day >= 1 ? "rounded-xl border border-red-200 bg-red-50 p-3.5 flex flex-wrap items-center justify-between gap-3" : "rounded-xl border border-border bg-background p-3.5 flex flex-wrap items-center justify-between gap-3"}>
                    <p className={late && late.day >= 1 ? "text-sm text-red-800" : "text-sm"}>
                      {late && late.day >= 1
                        ? <><b>Mensalidade de {formatCurrency(toPay.amount)} vencida em {dayDate(toPay.due_at)}.</b> {late.day >= 9 ? "Pague hoje para não pausar o acesso amanhã." : `Pague até ${dayDate(late.payBy)} para não pausar o acesso.`}</>
                        : <><b>Fatura de {formatCurrency(toPay.amount)}</b> vence em {dayDate(toPay.due_at)}. Pix, boleto ou cartão.</>}
                    </p>
                    {toPay.payment_url
                      ? <a href={toPay.payment_url} target="_blank" rel="noopener" className={buttonClass("primary", "md")}><CreditCard className="h-4 w-4" /> Pagar {formatCurrency(toPay.amount)}</a>
                      : <a href={support(`Olá! Sou do ${org.name} (${org.slug}) e quero pagar a mensalidade de ${formatCurrency(toPay.amount)}.`)} target="_blank" rel="noopener" className={buttonClass("primary", "md")}><MessageCircle className="h-4 w-4" /> Pedir o link de pagamento</a>}
                  </div>
                ) : null}
                {sp.reativada === "1" ? <Alert tone="success">Assinatura reativada. Tudo voltou como estava.</Alert> : null}
                {refunds.length ? (
                  <div className="text-sm space-y-1">
                    {refunds.map((r) => <p key={r.id}>Reembolso de <b>{formatCurrency(r.amount)}</b>: {r.status === "done" ? "feito" : r.status === "requested" ? "pedido ao banco, cai em alguns dias" : "a Komyx envia por Pix em até 5 dias úteis"}.</p>)}
                  </div>
                ) : null}
                <div>
                  <PlanCard
                    options={planOptions(bill?.monthly_price)}
                    current={period}
                    pending={bill?.pending_period && bill.pending_from && isPeriodMonths(bill.pending_period) ? { months: bill.pending_period, label: PERIOD_LABEL[bill.pending_period], from: dayDate(bill.pending_from) } : null}
                    trial={neverPaid}
                    trialEnd={bill?.due_at ? dayDate(bill.due_at) : null}
                    subscribed={Boolean(bill?.provider_subscription_id)}
                    missing={billingDataMissing(org)}
                    cancelled={org.status === "cancelled"}
                  />
                </div>
                {org.status === "cancelled" ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm space-y-2">
                    <p className="font-medium text-red-700">Assinatura cancelada{org.cancelled_at ? ` em ${dayDate(org.cancelled_at.slice(0, 10))}` : ""}.</p>
                    <p className="text-red-700/80">{org.access_until ? `Acesso até ${dayDate(org.access_until)}. ` : ""}Página pública fora do ar. Dados guardados por 90 dias depois do fim do acesso.</p>
                    <form action={reactivateSubscription}><PendingButton className={buttonClass("primary", "sm")}>Reativar assinatura</PendingButton></form>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <a href={support(`Olá! Sou do ${org.name} (${org.slug}) e preciso de ajuda com a assinatura Komyx.`)} target="_blank" rel="noopener" className={buttonClass("outline", "sm")}><MessageCircle className="h-4 w-4" /> Ajuda com a assinatura</a>
                    <CancelSubscription choices={choices} summary={cancelSummary} />
                  </div>
                )}
                <p className="text-xs text-muted">Ciclo atual: {bill?.cycle_start ? dayDate(bill.cycle_start) : "—"} a {bill?.due_at ? dayDate(bill.due_at) : "—"}. <a href="/termos#assinatura" className="underline underline-offset-2">Regras da assinatura</a>.</p>
              </CardBody>
            </Card>

            <Card id="faturas">
              <CardHeader title="Faturas" subtitle="Mensalidades do Komyx" />
              <CardBody className="space-y-3">
                {(faturas ?? []).length === 0 ? <p className="text-sm text-muted">Nenhuma fatura ainda.</p> : (
                  <div className="overflow-x-auto -mx-4 px-4">
                    <table className="w-full text-sm">
                      <thead className="text-xs uppercase tracking-wide text-muted border-b border-border">
                        <tr><th className="text-left py-2 pr-3">Período</th><th className="text-right py-2 pr-3">Valor</th><th className="text-left py-2 pr-3">Vencimento</th><th className="text-left py-2">Status</th></tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {faturas!.map((f) => {
                          const v = invoiceView(f, today);
                          return (
                            <tr key={f.id}>
                              <td className="py-2.5 pr-3 whitespace-nowrap">{dayDate(f.period_start)} a {dayDate(f.period_end)}</td>
                              <td className="py-2.5 pr-3 text-right whitespace-nowrap">{formatCurrency(f.amount)}</td>
                              <td className="py-2.5 pr-3 whitespace-nowrap">{dayDate(f.due_at)}</td>
                              <td className="py-2.5"><Badge tone={INVOICE_VIEW_TONE[v]}>{INVOICE_VIEW_LABEL[v]}</Badge>{f.paid_at ? <span className="block text-xs text-muted">pago em {dayDate(f.paid_at)}</span> : null}{f.status === "open" && f.payment_url ? <a href={f.payment_url} target="_blank" rel="noopener" className="ml-2 text-sm font-semibold text-brand hover:underline">Pagar</a> : null}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className="text-xs text-muted">{billingProviderInfo().ownerInstructions}</p>
              </CardBody>
            </Card>

          </>
        ) : null}
      </PageBody>
    </>
  );
}

/** The cancellation choices with their copy (docs/assinatura.md §5, including the "5º mês" sentence). */
function cancelCopy(dueAt: string | null, lastPaid: PaidInvoice | null, today: string, neverPaid: boolean) {
  const { options, monthIndex } = cancelOptions({ dueAt, lastPaid, today });
  const keep = options.find((o) => o.key === "keep")!;
  const full = options.find((o) => o.key === "full_7_days");
  const prorata = options.find((o) => o.key === "prorata");
  const choices: CancelChoice[] = options.map((o) => ({
    key: o.key,
    title: o.key === "keep" ? "Usar até o fim, sem reembolso" : o.key === "full_7_days" ? `Receber ${formatCurrency(o.refund)} de volta` : `Receber ${formatCurrency(o.refund)} de volta e usar até ${brDate(o.accessUntil)}`,
    description: o.key === "keep"
      ? (neverPaid ? `Você usa o Komyx até ${brDate(o.accessUntil)}, fim do teste grátis. Nada é cobrado.` : `Você usa o Komyx até ${brDate(o.accessUntil)}, fim do período pago.`)
      : o.key === "full_7_days"
        ? `Pagamento feito há até 7 dias: devolvemos tudo e o acesso termina agora.`
        : `Pago menos ${monthIndex} ${monthIndex === 1 ? "mês usado" : "meses usados"} × ${formatCurrency(149)}. O mês começado conta como usado.`,
  }));
  // Most useful option first: the refund when there is one.
  choices.sort((a, b) => (a.key === "keep" ? 1 : 0) - (b.key === "keep" ? 1 : 0));
  let cancelSummary: string | null = null;
  if (prorata && monthIndex) cancelSummary = `Você está no ${monthIndex}º mês. Se cancelar agora, devolvemos ${formatCurrency(prorata.refund)} e você usa o Komyx até ${brDate(prorata.accessUntil)}. Ou continue até ${brDate(keep.accessUntil)} sem reembolso.`;
  else if (full && lastPaid?.paid_at) cancelSummary = `Você pagou há ${daysBetween(lastPaid.paid_at, today)} dia(s): pode receber os ${formatCurrency(full.refund)} de volta (o acesso termina agora) ou usar até ${brDate(keep.accessUntil)} sem reembolso.`;
  else if (!neverPaid) cancelSummary = `Sem reembolso: você usa o Komyx até ${brDate(keep.accessUntil)}, fim do período pago.`;
  else cancelSummary = `Seu teste grátis vai até ${brDate(keep.accessUntil)}. Nada é cobrado.`;
  return { choices, cancelSummary };
}
