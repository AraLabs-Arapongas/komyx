"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, Plus, PartyPopper, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/home", label: "Início", icon: Home },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/eventos/novo", label: "Criar", icon: Plus, primary: true },
  { href: "/eventos", label: "Eventos", icon: PartyPopper },
  { href: "/menu", label: "Menu", icon: Menu },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur safe-bottom md:hidden" aria-label="Navegação principal">
      <ul className="mx-auto grid max-w-3xl grid-cols-5">
        {items.map((item) => {
          const active = item.href === "/eventos" ? pathname === "/eventos" || (pathname.startsWith("/eventos/") && pathname !== "/eventos/novo") : pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          if ("primary" in item && item.primary) {
            return (
              <li key={item.href} className="flex justify-center">
                <Link href={item.href} className="-mt-5 h-14 w-14 rounded-full bg-brand text-brand-fg grid place-items-center shadow-lg shadow-orange-900/20 active:scale-95 transition" aria-label="Nova pré-reserva">
                  <Icon className="h-6 w-6" />
                </Link>
              </li>
            );
          }
          return (
            <li key={item.href}>
              <Link href={item.href} className={cn("flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium", active ? "text-brand" : "text-muted")}
                aria-current={active ? "page" : undefined}>
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
