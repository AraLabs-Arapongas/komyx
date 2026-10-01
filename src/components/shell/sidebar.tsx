"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, Plus, PartyPopper, Users, Inbox, Settings, Package, FileText, Cake, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonClass } from "@/components/ui/button";

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

export function Sidebar({ orgName, userName, role, isAdmin = false }: { orgName: string; userName: string; role: string; isAdmin?: boolean }) {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-surface min-h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-border">
        <p className="font-semibold truncate">{orgName}</p>
        <p className="text-xs text-muted truncate">{userName} · {role === "owner" ? "Proprietário" : "Equipe"}</p>
      </div>
      <div className="p-3">
        <Link href="/eventos/novo" className={buttonClass("primary", "md", "w-full")}>
          <Plus className="h-4 w-4" /> Nova pré-reserva
        </Link>
      </div>
      <nav className="px-3 space-y-0.5">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium", active ? "bg-brand-soft text-brand" : "text-foreground hover:bg-stone-100")}>
              <Icon className="h-4.5 w-4.5" /> {label}
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
      <form action="/auth/signout" method="post" className="mt-auto p-3">
        <button className="w-full text-left text-sm text-muted hover:text-foreground px-3 py-2">Sair</button>
      </form>
    </aside>
  );
}
