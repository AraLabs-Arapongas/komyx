import { MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, getOrganization, getBilling } from "@/lib/data/session";
import { PageBody, PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { formatCurrency, formatDate, toDateKey, whatsappLink } from "@/lib/utils";
import { PLAN_LABEL, PLAN_PRICES, BILLING_STATUS_LABEL, SUPPORT_WHATSAPP } from "@/lib/billing";
import { NameForm, PasswordForm, EmailNotificationsForm } from "./account-forms";
import { CancelSubscription } from "./cancel-subscription";
import { reactivateSubscription } from "@/lib/actions/subscription";
import { Alert } from "@/components/ui/page";
import { PendingButton } from "@/components/ui/pending-button";
import { billingProvider } from "@/lib/billing/provider";
import { INVOICE_VIEW_LABEL, INVOICE_VIEW_TONE, invoiceView } from "@/lib/billing/invoices";

export const metadata = { title: "Minha conta" };

export default async function AccountPage({ searchParams }: PageProps<"/conta">) {
  const [profile, org, sp] = await Promise.all([requireProfile(), getOrganization(), searchParams]);
  const isOwner = profile.role === "owner";
  const bill = await getBilling(profile);
  const supabase = await createClient();
  const { data: prefs } = await supabase.from("profiles").select("email_notifications").eq("id", profile.id).single();
  // Komyx invoices (billing_invoices): RLS returns only this buffet's rows, and only to the owner.
  const { data: faturas } = isOwner ? await supabase.from("billing_invoices").select("id, period_start, period_end, amount, due_at, status, paid_at").neq("status", "void").order("due_at", { ascending: false }).limit(24) : { data: [] };
  const today = toDateKey(new Date());
  const price = PLAN_PRICES[org.plan] ?? 0;
  const dayDate = (d: string) => formatDate(`${d}T12:00:00-03:00`);
  const support = (msg: string) => whatsappLink(SUPPORT_WHATSAPP, msg);

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
                  <div><dt className="text-xs text-muted">Plano atual</dt><dd className="font-medium">{PLAN_LABEL[org.plan] ?? org.plan}{org.plan === "premium" ? <span className="block text-xs text-muted font-normal">Oferta de lançamento: Premium pelo preço do Básico, para sempre.</span> : null}</dd></div>
                  <div><dt className="text-xs text-muted">Valor mensal</dt><dd className="font-medium">{formatCurrency(price)}</dd></div>
                  <div><dt className="text-xs text-muted">{bill?.status === "trial" ? "Fim do teste grátis" : "Próxima cobrança"}</dt><dd className="font-medium">{bill?.due_at ? dayDate(bill.due_at) : "—"}</dd></div>
                  <div><dt className="text-xs text-muted">Status</dt><dd>{org.status === "cancelled" ? <Badge tone="red">Cancelada</Badge> : <Badge tone={bill?.status === "overdue" ? "red" : bill?.status === "due" ? "amber" : bill?.status === "trial" ? "brand" : "green"}>{BILLING_STATUS_LABEL[bill?.status ?? "ok"] ?? bill?.status}</Badge>}</dd></div>
                </dl>
                {sp.reativada === "1" ? <Alert tone="success">Assinatura reativada. Tudo voltou como estava.</Alert> : null}
                {org.status === "cancelled" ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm space-y-2">
                    <p className="font-medium text-red-700">Assinatura cancelada{org.cancelled_at ? ` em ${dayDate(org.cancelled_at.slice(0, 10))}` : ""}.</p>
                    <p className="text-red-700/80">{org.access_until ? `Acesso até ${dayDate(org.access_until)}. ` : ""}Página pública fora do ar. Dados guardados por 90 dias depois do fim do acesso.</p>
                    <form action={reactivateSubscription}><PendingButton className={buttonClass("primary", "sm")}>Reativar assinatura</PendingButton></form>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <a href={support(`Olá! Sou do ${org.name} (${org.slug}) e quero alterar a forma de pagamento da assinatura Komyx.`)} target="_blank" rel="noopener" className={buttonClass("outline", "sm")}><MessageCircle className="h-4 w-4" /> Alterar forma de pagamento</a>
                    <CancelSubscription accessHint={bill?.due_at ? `Você continua com acesso até ${dayDate(bill.due_at)}, fim do período já pago.` : "Você continua com acesso por 7 dias."} />
                  </div>
                )}
                <p className="text-xs text-muted">Alterações de plano e forma de pagamento são feitas com o suporte Komyx pelo WhatsApp; o cancelamento é por aqui mesmo. O ciclo atual vai de {bill?.cycle_start ? dayDate(bill.cycle_start) : "—"} até {bill?.due_at ? dayDate(bill.due_at) : "—"}.</p>
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
                              <td className="py-2.5"><Badge tone={INVOICE_VIEW_TONE[v]}>{INVOICE_VIEW_LABEL[v]}</Badge>{f.paid_at ? <span className="block text-xs text-muted">pago em {dayDate(f.paid_at)}</span> : null}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className="text-xs text-muted">{billingProvider.ownerInstructions}</p>
              </CardBody>
            </Card>

          </>
        ) : null}
      </PageBody>
    </>
  );
}
