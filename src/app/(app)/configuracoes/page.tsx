import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireOwner, getOrganization } from "@/lib/data/session";
import { removeStaff } from "@/lib/actions/settings";
import { PageBody, PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { appUrl } from "@/lib/utils";
import { CONTRACT_PLACEHOLDERS } from "@/lib/contract";
import { OrganizationForm, ImageUploadForm, StaffForm, PaymentPlanForm, ContractTemplateForm } from "./forms";

export const metadata = { title: "Configurações" };

type PlanItem = { label: string; percent: number; rule: "ON_ACCEPT" | "DAYS_BEFORE_EVENT" | "FIXED_DATE"; days_before: number | null };

export default async function SettingsPage() {
  const profile = await requireOwner();
  const org = await getOrganization();
  const supabase = await createClient();
  const { data: team } = await supabase.from("profiles").select("id, name, email, role").order("role").order("name");
  const plan = (Array.isArray(org.payment_plan) ? org.payment_plan : []) as PlanItem[];
  const publicUrl = appUrl(`/p/${org.slug}`);

  return (
    <>
      <PageHeader title="Configurações" back="/menu" />
      <PageBody>
        <Card>
          <CardHeader title="Página pública e link da bio" subtitle="Use na bio do Instagram. Adicione ?src=instagram para saber de onde veio o lead." action={
            <Link href={`/p/${org.slug}`} target="_blank" className="text-sm text-brand font-medium inline-flex items-center gap-1">Abrir <ExternalLink className="h-3.5 w-3.5" /></Link>
          } />
          <CardBody className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-2"><span className="text-muted break-all">{publicUrl}</span><CopyButton text={publicUrl} /></div>
            <div className="flex items-center justify-between gap-2"><span className="text-muted break-all">{publicUrl}?src=instagram</span><CopyButton text={`${publicUrl}?src=instagram`} label="Bio Instagram" /></div>
            <div className="flex items-center justify-between gap-2"><span className="text-muted break-all">{publicUrl}/orcamento?src=instagram</span><CopyButton text={`${publicUrl}/orcamento?src=instagram`} label="Orçamento direto" /></div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Dados do buffet" subtitle="Razão social, CNPJ e cidade entram no contrato" />
          <CardBody><OrganizationForm org={org} /></CardBody>
        </Card>

        <Card>
          <CardHeader title="Plano de pagamento padrão" subtitle="Aplicado a novos orçamentos. Ex.: 30% no aceite e 70% até 7 dias antes da festa." />
          <CardBody><PaymentPlanForm plan={plan} /></CardBody>
        </Card>

        <Card>
          <CardHeader title="Modelo de contrato" subtitle="Preenchido automaticamente ao gerar o contrato de um evento" />
          <CardBody className="space-y-3">
            <details className="text-xs text-muted">
              <summary className="cursor-pointer font-medium text-foreground">Campos disponíveis</summary>
              <p className="mt-2 flex flex-wrap gap-1">{CONTRACT_PLACEHOLDERS.map((p) => <code key={p} className="rounded bg-stone-100 px-1.5 py-0.5">{`{{${p}}}`}</code>)}</p>
            </details>
            <ContractTemplateForm template={org.contract_template} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Imagens" subtitle="Logo e capa da página pública (JPG, PNG ou WebP até 5MB)" />
          <CardBody className="grid grid-cols-2 gap-4">
            <ImageUploadForm kind="logo" currentUrl={org.logo_url} />
            <ImageUploadForm kind="cover" currentUrl={org.cover_url} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Equipe" subtitle="Staff cria e edita eventos, clientes, orçamentos e pagamentos. Não altera configurações." />
          <CardBody className="space-y-4">
            <ul className="divide-y divide-border">
              {(team ?? []).map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{m.name} {m.id === profile.id ? <span className="text-muted text-xs">(você)</span> : null}</p>
                    <p className="text-xs text-muted truncate">{m.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={m.role === "owner" ? "brand" : "zinc"}>{m.role === "owner" ? "Proprietário" : "Equipe"}</Badge>
                    {m.role === "staff" ? (
                      <form action={removeStaff}>
                        <input type="hidden" name="id" value={m.id} />
                        <button className="text-xs text-muted hover:text-red-600">Remover</button>
                      </form>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
            <StaffForm />
          </CardBody>
        </Card>
      </PageBody>
    </>
  );
}
