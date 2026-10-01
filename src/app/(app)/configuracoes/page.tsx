import Link from "next/link";
import { Globe, Building2, Wallet, FileSignature, Users, ChevronRight } from "lucide-react";
import { requireOwner, getOrganization } from "@/lib/data/session";
import { createClient } from "@/lib/supabase/server";
import { PageBody, PageHeader } from "@/components/ui/page";
import { formatPhone } from "@/lib/utils";

export const metadata = { title: "Configurações" };

export default async function SettingsIndex() {
  await requireOwner();
  const org = await getOrganization();
  const supabase = await createClient();
  const { count: teamCount } = await supabase.from("profiles").select("id", { count: "exact", head: true });
  const plan = Array.isArray(org.payment_plan) ? (org.payment_plan as { label: string; percent: number }[]) : [];
  const gallery = Array.isArray(org.gallery) ? org.gallery.length : 0;

  const cards = [
    { href: "/configuracoes/pagina-publica", icon: Globe, title: "Página pública", desc: `Links, conteúdo, aparência e galeria · ${gallery} foto${gallery === 1 ? "" : "s"}` },
    { href: "/configuracoes/empresa", icon: Building2, title: "Empresa", desc: `${org.name}${org.whatsapp ? ` · ${formatPhone(org.whatsapp)}` : ""}${org.pix_key ? " · Pix configurado" : " · sem chave Pix"}` },
    { href: "/configuracoes/comercial", icon: Wallet, title: "Comercial", desc: plan.length ? `Plano de pagamento: ${plan.map((p) => `${Number(p.percent)}%`).join(" + ")}` : "Plano de pagamento padrão" },
    { href: "/configuracoes/contrato", icon: FileSignature, title: "Contrato", desc: "Modelo preenchido automaticamente ao gerar o contrato" },
    { href: "/configuracoes/equipe", icon: Users, title: "Equipe", desc: `${teamCount ?? 0} pessoa${(teamCount ?? 0) === 1 ? "" : "s"} com acesso` },
  ];

  return (
    <>
      <PageHeader title="Configurações" back="/menu" />
      <PageBody>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {cards.map(({ href, icon: Icon, title, desc }) => (
            <Link key={href} href={href} className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 hover:border-brand/50 hover:bg-stone-50">
              <span className="h-11 w-11 shrink-0 grid place-items-center rounded-xl bg-brand-soft text-brand"><Icon className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{title}</span>
                <span className="block text-sm text-muted truncate">{desc}</span>
              </span>
              <ChevronRight className="h-4 w-4 text-muted shrink-0" />
            </Link>
          ))}
        </div>
      </PageBody>
    </>
  );
}
