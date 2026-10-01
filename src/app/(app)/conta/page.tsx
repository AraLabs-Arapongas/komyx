import { MessageCircle, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, getOrganization, getBilling } from "@/lib/data/session";
import { PageBody, PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { formatCurrency, formatDate, whatsappLink } from "@/lib/utils";
import { PLAN_LABEL, PLAN_PRICES, BILLING_STATUS_LABEL, INVOICE_STATUS_LABEL, INVOICE_STATUS_TONE, SUPPORT_WHATSAPP } from "@/lib/billing";
import { NameForm, PasswordForm } from "./account-forms";

export const metadata = { title: "Minha conta" };

export default async function AccountPage() {
  const [profile, org] = await Promise.all([requireProfile(), getOrganization()]);
  const isOwner = profile.role === "owner";
  const bill = await getBilling(profile);
  const supabase = await createClient();
  const { data: invoices } = isOwner ? await supabase.from("saas_invoices").select("id, description, amount, due_at, paid_at, status, method, receipt_url").order("due_at", { ascending: false }).limit(36) : { data: [] };
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
          </CardBody>
        </Card>

        {isOwner ? (
          <>
            <Card id="assinatura">
              <CardHeader title="Assinatura" subtitle="Cobrança do Festeja. Nada a ver com os pagamentos das festas." />
              <CardBody className="space-y-4">
                <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3 text-sm">
                  <div><dt className="text-xs text-muted">Plano atual</dt><dd className="font-medium">{PLAN_LABEL[org.plan] ?? org.plan}</dd></div>
                  <div><dt className="text-xs text-muted">Valor mensal</dt><dd className="font-medium">{formatCurrency(price)}</dd></div>
                  <div><dt className="text-xs text-muted">Próxima cobrança</dt><dd className="font-medium">{bill?.due_at ? dayDate(bill.due_at) : "—"}</dd></div>
                  <div><dt className="text-xs text-muted">Status</dt><dd><Badge tone={bill?.status === "overdue" ? "red" : bill?.status === "due" ? "amber" : bill?.status === "trial" ? "brand" : "green"}>{BILLING_STATUS_LABEL[bill?.status ?? "ok"] ?? bill?.status}</Badge></dd></div>
                </dl>
                <div className="flex flex-wrap gap-2">
                  <a href={support(`Olá! Sou do ${org.name} (${org.slug}) e quero alterar a forma de pagamento da assinatura Festeja.`)} target="_blank" rel="noopener" className={buttonClass("outline", "sm")}><MessageCircle className="h-4 w-4" /> Alterar forma de pagamento</a>
                  <a href={support(`Olá! Sou do ${org.name} (${org.slug}) e quero cancelar a assinatura Festeja.`)} target="_blank" rel="noopener" className={buttonClass("ghost", "sm", "text-red-600")}>Cancelar assinatura</a>
                </div>
                <p className="text-xs text-muted">Alterações de plano e pagamento são feitas com o suporte Festeja pelo WhatsApp. O ciclo atual vai de {bill?.cycle_start ? dayDate(bill.cycle_start) : "—"} até {bill?.due_at ? dayDate(bill.due_at) : "—"}.</p>
              </CardBody>
            </Card>

            <Card id="pagamentos">
              <CardHeader title="Pagamentos" subtitle="Histórico das mensalidades do Festeja" />
              <CardBody>
                {(invoices ?? []).length === 0 ? <p className="text-sm text-muted">Nenhuma cobrança registrada ainda.</p> : (
                  <div className="overflow-x-auto -mx-4 px-4">
                    <table className="w-full text-sm">
                      <thead className="text-xs uppercase tracking-wide text-muted border-b border-border">
                        <tr><th className="text-left py-2 pr-3">Data</th><th className="text-left py-2 pr-3">Descrição</th><th className="text-right py-2 pr-3">Valor</th><th className="text-left py-2 pr-3">Status</th><th className="text-right py-2">Recibo</th></tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {invoices!.map((i) => (
                          <tr key={i.id}>
                            <td className="py-2.5 pr-3 whitespace-nowrap">{dayDate(i.paid_at ?? i.due_at)}{!i.paid_at ? <span className="text-xs text-muted"> (vencimento)</span> : null}</td>
                            <td className="py-2.5 pr-3">{i.description}{i.method ? <span className="text-xs text-muted"> · {i.method}</span> : null}</td>
                            <td className="py-2.5 pr-3 text-right whitespace-nowrap">{formatCurrency(i.amount)}</td>
                            <td className="py-2.5 pr-3"><Badge tone={INVOICE_STATUS_TONE[i.status] ?? "zinc"}>{INVOICE_STATUS_LABEL[i.status] ?? i.status}</Badge></td>
                            <td className="py-2.5 text-right">{i.receipt_url ? <a href={i.receipt_url} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-brand font-medium"><Download className="h-3.5 w-3.5" /> PDF</a> : <span className="text-xs text-muted">—</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardBody>
            </Card>
          </>
        ) : null}
      </PageBody>
    </>
  );
}
