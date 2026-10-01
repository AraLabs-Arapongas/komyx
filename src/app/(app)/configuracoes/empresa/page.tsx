import { requireOwner, getOrganization } from "@/lib/data/session";
import { PageBody, PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { OrganizationForm } from "../forms";
import { UnsavedGuard } from "../unsaved-guard";

export const metadata = { title: "Empresa" };

export default async function CompanySettings() {
  await requireOwner();
  const org = await getOrganization();
  return (
    <>
      <PageHeader title="Empresa" back="/configuracoes" />
      <PageBody>
        <UnsavedGuard>
          <Card>
            <CardHeader title="Dados do buffet" subtitle="Descrição, WhatsApp, Instagram e endereço aparecem na sua página pública. Razão social, CNPJ e cidade entram no contrato." />
            <CardBody><OrganizationForm org={org} /></CardBody>
          </Card>
        </UnsavedGuard>
      </PageBody>
    </>
  );
}
