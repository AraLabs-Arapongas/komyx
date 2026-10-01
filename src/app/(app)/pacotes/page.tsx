import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/data/session";
import { togglePackage, toggleAddon, toggleTheme } from "@/lib/actions/settings";
import { PageBody, PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { PackageForm, AddonForm, ThemeForm } from "./forms";
import { NewItemMenu } from "./new-item-menu";
import { EmptyState } from "@/components/ui/page";

export const metadata = { title: "Pacotes" };

export default async function PackagesPage() {
  await requireOwner();
  const supabase = await createClient();
  const [{ data: packages }, { data: addons }, { data: themes }] = await Promise.all([
    supabase.from("packages").select("*").order("active", { ascending: false }).order("sort_order").order("name"),
    supabase.from("package_addons").select("*").order("active", { ascending: false }).order("sort_order").order("name"),
    supabase.from("party_themes").select("*").order("active", { ascending: false }).order("sort_order").order("name"),
  ]);

  return (
    <>
      <PageHeader title="Pacotes e adicionais" back="/menu" action={<NewItemMenu />} />
      <PageBody>
        <Card>
          <CardHeader title="Pacotes" subtitle="Preço-base, participantes incluídos e valor por participante extra" />
          <CardBody className="space-y-3">
            {(packages ?? []).map((p) => (
              <details key={p.id} className="rounded-xl border border-border">
                <summary className="flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer list-none">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.name} {!p.active ? <Badge tone="zinc" className="ml-1">inativo</Badge> : null}</p>
                    <p className="text-xs text-muted">{formatCurrency(p.base_price)} · {p.included_adults} adultos + {p.included_children} crianças · extra {formatCurrency(p.extra_adult_price)}/adulto, {formatCurrency(p.extra_child_price)}/criança</p>
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
            {(packages ?? []).length === 0 ? <EmptyState title="Nenhum pacote cadastrado." description="Use + Novo para criar o primeiro pacote." /> : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Adicionais" subtitle="Itens opcionais cobrados no orçamento" />
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
            {(addons ?? []).length === 0 ? <EmptyState title="Nenhum adicional cadastrado." description="Use + Novo para criar o primeiro adicional." /> : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Temas de festa" subtitle="Decorações que o cliente pode escolher ao pedir orçamento" />
          <CardBody className="space-y-3">
            {(themes ?? []).map((t) => (
              <details key={t.id} className="rounded-xl border border-border">
                <summary className="flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer list-none">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {t.photo_url ? <img src={t.photo_url} alt="" className="h-10 w-14 rounded-lg object-cover bg-stone-100 shrink-0" /> : <span className="h-10 w-14 rounded-lg bg-stone-100 shrink-0" />}
                    <div className="min-w-0">
                      <p className="font-medium truncate">{t.name} {!t.active ? <Badge tone="zinc" className="ml-1">inativo</Badge> : null}</p>
                      {t.description ? <p className="text-xs text-muted truncate">{t.description}</p> : null}
                    </div>
                  </div>
                  <span className="text-sm text-brand font-medium">Editar</span>
                </summary>
                <div className="border-t border-border p-3 space-y-3">
                  <ThemeForm theme={t} />
                  <form action={toggleTheme}>
                    <input type="hidden" name="id" value={t.id} />
                    <input type="hidden" name="active" value={t.active ? "false" : "true"} />
                    <button className="text-sm text-muted hover:text-foreground">{t.active ? "Desativar tema" : "Reativar tema"}</button>
                  </form>
                </div>
              </details>
            ))}
            {(themes ?? []).length === 0 ? <EmptyState title="Nenhum tema cadastrado." description="Use + Novo para criar o primeiro tema." /> : null}
          </CardBody>
        </Card>
      </PageBody>
    </>
  );
}
