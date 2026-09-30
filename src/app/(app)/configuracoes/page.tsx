import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireOwner, getOrganization } from "@/lib/data/session";
import { removeStaff } from "@/lib/actions/settings";
import { PageBody, PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { appUrl } from "@/lib/utils";
import { OrganizationForm, ImageUploadForm, StaffForm } from "./forms";

export const metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const profile = await requireOwner();
  const org = await getOrganization();
  const supabase = await createClient();
  const { data: team } = await supabase.from("profiles").select("id, name, email, role").order("role").order("name");

  return (
    <>
      <PageHeader title="Configurações" back="/menu" />
      <PageBody>
        <Card>
          <CardHeader title="Página pública" subtitle="Endereço do seu buffet para clientes" action={
            <Link href={`/p/${org.slug}`} target="_blank" className="text-sm text-brand font-medium inline-flex items-center gap-1">Abrir <ExternalLink className="h-3.5 w-3.5" /></Link>
          } />
          <CardBody><p className="text-sm break-all text-muted">{appUrl(`/p/${org.slug}`)}</p></CardBody>
        </Card>

        <Card>
          <CardHeader title="Dados do buffet" />
          <CardBody><OrganizationForm org={org} /></CardBody>
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
