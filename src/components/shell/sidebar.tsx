"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, PartyPopper, Users, Inbox, Settings, Package, FileText, Cake, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { NewMenu } from "@/components/shell/new-menu";
import { AccountFooter, type Billing } from "@/components/shell/account-footer";

const links = [
  { href: "/home", label: "Início", icon: Home },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/eventos", label: "Eventos", icon: PartyPopper },
  { href: "/orcamentos", label: "Orçamentos", icon: FileText },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/aniversariantes", label: "Aniversariantes", icon: Cake },
  { href: "/solicitacoes", label: "Solicitações", icon: Inbox },
  { href: "/pacotes", label: "Pacotes", icon: Package },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function Sidebar({ orgName, userName, userEmail, role, isAdmin = false, billing, newRequests = 0 }: { orgName: string; userName: string; userEmail: string; role: string; isAdmin?: boolean; billing: Billing; newRequests?: number }) {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-surface h-screen sticky top-0 self-start overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <p className="font-semibold truncate">{orgName}</p>
        <p className="text-xs text-muted truncate">{role === "owner" ? "Proprietário" : "Equipe"}</p>
      </div>
      <div className="p-3">
        <NewMenu />
      </div>
      <nav className="px-3 space-y-0.5 overflow-y-auto min-h-0">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium", active ? "bg-brand-soft text-brand" : "text-foreground hover:bg-stone-100")}>
              <Icon className="h-4.5 w-4.5" /> <span className="flex-1">{label}</span>
              {href === "/solicitacoes" && newRequests > 0 ? <span className="min-w-5 h-5 px-1.5 rounded-full bg-brand text-brand-fg text-[11px] font-semibold grid place-items-center" title="Novas solicitações">{newRequests > 99 ? "99+" : newRequests}</span> : null}
            </Link>
          );
        })}
      </nav>
      {isAdmin ? (
        <div className="px-3 pt-3">
          <Link href="/admin" className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium", pathname.startsWith("/admin") ? "bg-brand-soft text-brand" : "text-foreground hover:bg-stone-100")}>
            <ShieldCheck className="h-4.5 w-4.5" /> Admin Festeja
          </Link>
        </div>
      ) : null}
      <div className="mt-auto"><AccountFooter name={userName} email={userEmail} role={role} billing={billing} /></div>
    </aside>
  );
}
