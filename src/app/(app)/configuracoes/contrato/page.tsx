import { requireOwner, getOrganization } from "@/lib/data/session";
import { PageBody, PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { CONTRACT_PLACEHOLDERS } from "@/lib/contract";
import { ContractTemplateForm } from "../forms";
import { UnsavedGuard } from "../unsaved-guard";

export const metadata = { title: "Contrato" };

export default async function ContractSettings() {
  await requireOwner();
  const org = await getOrganization();
  return (
    <>
      <PageHeader title="Contrato" back="/configuracoes" />
      <PageBody>
        <UnsavedGuard>
          <Card>
            <CardHeader title="Modelo de contrato" subtitle="Preenchido automaticamente ao gerar o contrato de um evento" />
            <CardBody className="space-y-3">
              <details className="text-xs text-muted">
                <summary className="cursor-pointer font-medium text-foreground">Variáveis disponíveis</summary>
                <p className="mt-2 flex flex-wrap gap-1">{CONTRACT_PLACEHOLDERS.map((p) => <code key={p} className="rounded bg-stone-100 px-1.5 py-0.5">{`{{${p}}}`}</code>)}</p>
              </details>
              <ContractTemplateForm template={org.contract_template} />
            </CardBody>
          </Card>
        </UnsavedGuard>
      </PageBody>
    </>
  );
}
