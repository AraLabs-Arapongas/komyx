import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { getLateBilling, getOrganization, requireProfile } from "@/lib/data/session";
import { PageBody, PageHeader } from "@/components/ui/page";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { formatCurrency, formatDate, whatsappLink } from "@/lib/utils";
import { SUPPORT_WHATSAPP } from "@/lib/billing";
import { billingDataMissing, isPeriodMonths, periodPrice, planOptions, PERIOD_LABEL } from "@/lib/billing/plans";
import { ReactivateButton } from "@/components/billing/reactivate-button";
import { PlanCard } from "./plan-card";
import { CancelSubscription } from "./cancel-subscription";
import { SubscribeButton } from "./subscribe-button";
import { PayButton } from "./pay-button";

export const metadata = { title: "Assinatura" };

type Tone = "brand" | "green" | "amber" | "red" | "zinc";

/**
 * The Komyx subscription, one situation at a time with one button. Paying, subscribing and reactivating
 * all happen on the Asaas page; Komyx only shows the state (from the Asaas webhooks) and gates access.
 */
export default async function SubscriptionPage() {
  const [profile, org] = await Promise.all([requireProfile(), getOrganization()]);
  if (profile.role !== "owner") redirect("/home");
  const state = await getLateBilling(profile);
  const bill = state?.bill ?? null;
  const late = state?.late && state.late.day >= 1 ? state.late : null;
  const toPay = state?.open[0] ?? null;
  const period = isPeriodMonths(bill?.billing_period) ? bill.billing_period : 1;
  const price = periodPrice(period, bill?.monthly_price);
  const day = (d: string | null | undefined) => (d ? formatDate(`${d}T12:00:00-03:00`) : "—");
  const cancelled = org.status === "cancelled";
  const trial = bill?.status === "trial" && !bill.provider_subscription_id;
  const missing = billingDataMissing(org);

  // Always "Pagar": with no Asaas link yet, the action creates the charge and opens it.
  const pay = toPay?.payment_url
    ? <a href={toPay.payment_url} target="_blank" rel="noopener" className={buttonClass("primary", "md")}>Pagar {formatCurrency(toPay.amount)} <ExternalLink className="h-4 w-4" /></a>
    : toPay
      ? <PayButton invoiceId={toPay.id} amount={toPay.amount} />
      : null;

  let badge: [string, Tone];
  let text: React.ReactNode;
  let action: React.ReactNode = null;
  if (cancelled) {
    badge = ["Cancelada", "red"];
    text = org.access_until ? `Assinatura cancelada. Acesso até ${day(org.access_until)}.` : "Assinatura cancelada.";
    action = <ReactivateButton amount={price} size="md" />;
  } else if (late) {
    badge = [`Atrasada ${late.day} dia${late.day === 1 ? "" : "s"}`, late.day >= 9 ? "red" : "amber"];
    const what = toPay ? `Mensalidade de ${formatCurrency(toPay.amount)} vencida em ${day(toPay.due_at)}.` : `Mensalidade vencida em ${day(late.since)}.`;
    text = late.day >= 9 ? `${what} Amanhã seu acesso será pausado.` : `${what} Pague até ${day(late.payBy)} para não pausar o acesso.`;
    action = pay;
  } else if (toPay) {
    badge = trial || bill?.status === "trial" ? ["Teste grátis", "brand"] : ["Fatura aberta", "zinc"];
    text = `Fatura de ${formatCurrency(toPay.amount)} vence em ${day(toPay.due_at)}.`;
    action = pay;
  } else if (trial) {
    badge = ["Teste grátis", "brand"];
    text = `Seu teste grátis vai até ${day(bill?.due_at)}. Assine para continuar depois disso.`;
    action = missing.length
      ? <p className="text-sm">Para assinar, complete {missing.join(" e ")} em <Link href="/configuracoes/empresa" className="font-semibold text-brand underline underline-offset-2">Configurações › Empresa</Link>.</p>
      : <SubscribeButton months={period} />;
  } else {
    badge = ["Em dia", "green"];
    text = `Próxima cobrança em ${day(bill?.due_at)}. O Asaas te avisa antes, com o link para pagar.`;
  }

  return (
    <>
      <PageHeader title="Assinatura" subtitle="Seu plano do Komyx" />
      <PageBody className="max-w-2xl">
        <Card>
          <CardBody className="space-y-4 pt-5" data-testid="subscription">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">Plano {PERIOD_LABEL[period].toLowerCase()} · {formatCurrency(price)}{period === 1 ? "/mês" : ` a cada ${period} meses`}</p>
              <Badge tone={badge[1]}>{badge[0]}</Badge>
            </div>
            <p className="text-sm text-muted" data-testid="subscription-status">{text}</p>
            {action}
            {cancelled ? null : (
              <div className="border-t border-border pt-4 space-y-3">
                {/* While late, paying comes first: no plan change until it is settled. */}
                {late ? null : <PlanCard
                  options={planOptions(bill?.monthly_price)}
                  current={period}
                  pending={bill?.pending_period && bill.pending_from && isPeriodMonths(bill.pending_period) ? { months: bill.pending_period, label: PERIOD_LABEL[bill.pending_period], from: day(bill.pending_from) } : null}
                  trial={bill?.status === "trial"}
                  cancelled={false}
                />}
                <CancelSubscription accessUntil={bill?.due_at ? day(bill.due_at) : null} />
              </div>
            )}
          </CardBody>
        </Card>
        <p className="mt-3 text-xs text-muted"><a href="/termos#assinatura" className="underline underline-offset-2">Regras da assinatura</a> · Dúvidas? <a href={whatsappLink(SUPPORT_WHATSAPP, `Olá! Sou do ${org.name} e tenho uma dúvida sobre a assinatura.`)} target="_blank" rel="noopener" className="underline underline-offset-2">Fale com a gente</a></p>
      </PageBody>
    </>
  );
}
