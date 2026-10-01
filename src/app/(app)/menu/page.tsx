import Link from "next/link";
import { Users, Inbox, Package, Settings, ExternalLink, ChevronRight, FileText, Cake, ShieldCheck, Bell, UserCircle } from "lucide-react";
import { AccountFooter } from "@/components/shell/account-footer";
import { requireProfile, getOrganization } from "@/lib/data/session";
import { PageBody, PageHeader } from "@/components/ui/page";

export const metadata = { title: "Menu" };

export default async function MenuPage() {
  const [profile, org] = await Promise.all([requireProfile(), getOrganization()]);
  const isOwner = profile.role === "owner";
  const items = [
    { href: "/notificacoes", label: "Notificações", desc: "Pedidos de orçamento, reservas online, contratos aceitos", icon: Bell },
    { href: "/orcamentos", label: "Orçamentos", desc: "Todos os orçamentos, PDF e status", icon: FileText },
    { href: "/clientes", label: "Clientes", desc: "Cadastro e histórico", icon: Users },
    { href: "/aniversariantes", label: "Aniversariantes", desc: "Promoções para o próximo ano", icon: Cake },
    { href: "/solicitacoes", label: "Solicitações", desc: "Pedidos da página pública", icon: Inbox },
    ...(isOwner ? [
      { href: "/pacotes", label: "Pacotes e adicionais", desc: "Catálogo para orçamentos", icon: Package },
      { href: "/conta", label: "Minha conta", desc: "Seu perfil, senha e assinatura do Festeja", icon: UserCircle },
  { href: "/configuracoes", label: "Configurações", desc: "Dados do buffet, equipe, prazos", icon: Settings },
    ] : []),
    { href: `/p/${org.slug}`, label: "Página pública", desc: "Como o cliente vê seu buffet", icon: ExternalLink, external: true },
    ...(profile.is_platform_admin ? [{ href: "/admin", label: "Admin Festeja", desc: "Gerenciar buffets da plataforma", icon: ShieldCheck }] : []),
  ];
  return (
    <>
      <PageHeader title={org.name} subtitle={`${profile.name} · ${isOwner ? "Proprietário" : "Equipe"}`} />
      <PageBody>
        <ul className="rounded-2xl border border-border bg-surface divide-y divide-border overflow-hidden">
          {items.map(({ href, label, desc, icon: Icon, ...rest }) => (
            <li key={href}>
              <Link href={href} target={"external" in rest ? "_blank" : undefined} className="flex items-center gap-3 px-4 py-3.5 hover:bg-stone-50">
                <span className="h-10 w-10 rounded-xl bg-brand-soft text-brand grid place-items-center"><Icon className="h-5 w-5" /></span>
                <span className="flex-1 min-w-0"><span className="block font-medium">{label}</span><span className="block text-sm text-muted truncate">{desc}</span></span>
                <ChevronRight className="h-4 w-4 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
        <div className="rounded-2xl border border-border bg-surface p-3">
          <AccountFooter compact name={profile.name} email={profile.email} role={profile.role} billing={{ cycleStart: org.billing_cycle_start, dueAt: org.billing_due_at, status: org.billing_status, plan: org.plan }} />
        </div>
      </PageBody>
    </>
  );
}
