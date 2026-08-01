'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ShoppingBag, Wallet, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const itens = [
  { href: '/app', label: 'Início', icon: LayoutDashboard },
  { href: '/app/vendas', label: 'Vendas', icon: ShoppingBag },
  { href: '/app/recebimentos', label: 'Recebimentos', icon: Wallet },
  { href: '/app/configuracao', label: 'Ajustes', icon: Settings },
]

export function AppNav() {
  const path = usePathname()
  const ativo = (href: string) => href === '/app' ? path === '/app' : path.startsWith(href)
  return (
    <>
      {/* mobile: bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-card md:hidden">
        {itens.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className={cn('flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]',
              ativo(href) ? 'text-foreground font-medium' : 'text-muted-foreground')}>
            <Icon size={20} />{label}
          </Link>
        ))}
      </nav>
      {/* desktop: sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r bg-card p-4 md:flex">
        <p className="mb-6 text-lg font-bold">ConsorPro</p>
        {itens.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className={cn('flex items-center gap-2 rounded-[10px] px-3 py-2 text-sm',
              ativo(href) ? 'bg-background font-medium' : 'text-muted-foreground hover:text-foreground')}>
            <Icon size={18} />{label}
          </Link>
        ))}
      </aside>
    </>
  )
}
