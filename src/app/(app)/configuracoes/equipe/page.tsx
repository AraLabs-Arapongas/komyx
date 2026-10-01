import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/data/session";
import { removeStaff } from "@/lib/actions/settings";
import { PageBody, PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StaffForm } from "../forms";

export const metadata = { title: "Equipe" };

export default async function TeamSettings() {
  const profile = await requireOwner();
  const supabase = await createClient();
  const { data: team } = await supabase.from("profiles").select("id, name, email, role").order("role").order("name");
  return (
    <>
      <PageHeader title="Equipe" back="/configuracoes" />
      <PageBody>
        <Card>
          <CardHeader title="Quem tem acesso" subtitle="Equipe cria e edita eventos, clientes, orçamentos e pagamentos. Não altera configurações." />
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
