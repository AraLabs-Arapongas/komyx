import { PageBody, PageHeader } from "@/components/ui/page";
import { Card, CardBody } from "@/components/ui/card";
import { NewBuffetForm } from "./form";

export const metadata = { title: "Novo buffet · Admin" };

export default function NewBuffetPage() {
  return (
    <>
      <PageHeader title="Novo buffet" subtitle="Cria a empresa e o acesso do responsável" back="/admin/buffets" />
      <PageBody>
        <Card><CardBody className="pt-4"><NewBuffetForm /></CardBody></Card>
      </PageBody>
    </>
  );
}
