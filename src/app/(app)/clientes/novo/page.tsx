import { PageBody, PageHeader } from "@/components/ui/page";
import { CustomerForm } from "../customer-form";

export const metadata = { title: "Novo cliente" };

export default async function NewCustomerPage({ searchParams }: PageProps<"/clientes/novo">) {
  const sp = await searchParams;
  const returnTo = typeof sp.return_to === "string" ? sp.return_to : undefined;
  return (
    <>
      <PageHeader title="Novo cliente" back="/clientes" />
      <PageBody><CustomerForm returnTo={returnTo} /></PageBody>
    </>
  );
}
