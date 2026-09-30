import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/data/session";
import { togglePackage, toggleAddon } from "@/lib/actions/settings";
import { PageBody, PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { PackageForm, AddonForm } from "./forms";

export const metadata = { title: "Pacotes" };

export default async function PackagesPage() {
  await requireOwner();
  const supabase = await createClient();
  const [{ data: packages }, { data: addons }] = await Promise.all([
    supabase.from("packages").select("*").order("active", { ascending: false }).order("sort_order").order("name"),
    supabase.from("package_addons").select("*").order("active", { ascending: false }).order("sort_order").order("name"),
  ]);

  return (
    <>
      <PageHeader title="Pacotes e adicionais" back="/menu" />
      <PageBody>
        <Card>
          <CardHeader title="Pacotes" subtitle="Preço-base, participantes incluídos e valor por participante extra" />
          <CardBody className="space-y-3">
            {(packages ?? []).map((p) => (
              <details key={p.id} className="rounded-xl border border-border">
                <summary className="flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer list-none">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.name} {!p.active ? <Badge tone="zinc" className="ml-1">inativo</Badge> : null}</p>
                    <p className="text-xs text-muted">{formatCurrency(p.base_price)} · {p.included_participants} incluídos · +{formatCurrency(p.additional_participant_price)}/extra</p>
                  </div>
                  <span className="text-sm text-brand font-medium">Editar</span>
                </summary>
                <div className="border-t border-border p-3 space-y-3">
                  <PackageForm pkg={p} />
                  <form action={togglePackage}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="active" value={p.active ? "false" : "true"} />
                    <button className="text-sm text-muted hover:text-foreground">{p.active ? "Desativar pacote" : "Reativar pacote"}</button>
                  </form>
                </div>
              </details>
            ))}
            <details className="rounded-xl border border-dashed border-border">
              <summary className="px-3 py-2.5 cursor-pointer list-none text-sm font-medium text-brand">+ Novo pacote</summary>
              <div className="border-t border-border p-3"><PackageForm /></div>
            </details>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Adicionais" subtitle="Itens opcionais cobrados por unidade no orçamento" />
          <CardBody className="space-y-3">
            {(addons ?? []).map((a) => (
              <details key={a.id} className="rounded-xl border border-border">
                <summary className="flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer list-none">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{a.name} {!a.active ? <Badge tone="zinc" className="ml-1">inativo</Badge> : null}</p>
                    <p className="text-xs text-muted">{formatCurrency(a.price)}</p>
                  </div>
                  <span className="text-sm text-brand font-medium">Editar</span>
                </summary>
                <div className="border-t border-border p-3 space-y-3">
                  <AddonForm addon={a} />
                  <form action={toggleAddon}>
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="active" value={a.active ? "false" : "true"} />
                    <button className="text-sm text-muted hover:text-foreground">{a.active ? "Desativar" : "Reativar"}</button>
                  </form>
                </div>
              </details>
            ))}
            <details className="rounded-xl border border-dashed border-border">
              <summary className="px-3 py-2.5 cursor-pointer list-none text-sm font-medium text-brand">+ Novo adicional</summary>
              <div className="border-t border-border p-3"><AddonForm /></div>
            </details>
          </CardBody>
        </Card>
      </PageBody>
    </>
  );
}
