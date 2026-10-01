import { requireOwner, getOrganization } from "@/lib/data/session";
import { PageBody, PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PaymentPlanForm } from "../forms";
import { UnsavedGuard } from "../unsaved-guard";

export const metadata = { title: "Comercial" };

type PlanItem = { label: string; percent: number; rule: "ON_ACCEPT" | "DAYS_BEFORE_EVENT" | "FIXED_DATE"; days_before: number | null };

export default async function CommercialSettings() {
  await requireOwner();
  const org = await getOrganization();
  const plan = (Array.isArray(org.payment_plan) ? org.payment_plan : []) as PlanItem[];
  return (
    <>
      <PageHeader title="Comercial" back="/configuracoes" />
      <PageBody>
        <UnsavedGuard>
          <Card>
            <CardHeader title="Plano de pagamento padrão" subtitle="Aplicado a novos orçamentos. Ex.: 30% no aceite e 70% até 7 dias antes da festa. O total do plano deve ser 100%." />
            <CardBody><PaymentPlanForm plan={plan} /></CardBody>
          </Card>
        </UnsavedGuard>
      </PageBody>
    </>
  );
}
