'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ShoppingBag, Wallet, Users, CircleUser } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/logo'
import { BotaoPrivacidade } from '@/components/privacidade'
import { BuscaGlobal } from '@/components/busca-global'
import { BotaoSair } from '@/components/botao-sair'

const itens = [
  { href: '/app', label: 'Início', icon: LayoutDashboard },
  { href: '/app/vendas', label: 'Vendas', icon: ShoppingBag },
  { href: '/app/recebimentos', label: 'Agenda', icon: Wallet },
  { href: '/app/clientes', label: 'Clientes', icon: Users },
  // Ajustes mora dentro do perfil: a aba segue acesa quando o corretor está lá,
  // senão ele fica sem referência de onde está na navegação
  { href: '/app/perfil', label: 'Perfil', icon: CircleUser, tambem: ['/app/configuracao'] },
]

export function AppNav() {
  const path = usePathname()
  // só o painel tem a aurora encostando no topo
  const noPainel = path === '/app'
  const ativo = (href: string, tambem: string[] = []) =>
    href === '/app'
      ? path === '/app'
      : path.startsWith(href) || tambem.some(p => path.startsWith(p))
  return (
    <>
      {/* barra superior em todas as larguras: esconder valores precisa estar
          a um toque de distância em qualquer tela. No desktop a marca já vive
          na lateral, então aqui sobra só o olho.

          No painel ela fica transparente e flutua sobre a aurora do hero: o
          bloco de marca é a maior superfície do produto, e uma faixa branca
          cortando o topo dele desperdiçava justamente a parte que se reconhece
          de longe. Nas outras telas, onde não há aurora atrás, ela volta a ter
          fundo — texto escuro sobre transparente sumiria. */}
      <div className={cn(
        'sticky top-0 z-30 flex h-[var(--altura-cabecalho)] items-center justify-between gap-2 px-4 py-2.5 md:justify-end md:pl-48',
        noPainel ? 'border-b border-transparent bg-transparent text-white' : 'border-b bg-card',
      )}>
        <Logo className="md:hidden" sobreEscuro={noPainel} />
        <div className="flex items-center gap-1">
          <BuscaGlobal className={noPainel ? 'text-white hover:bg-white/15 hover:text-white' : undefined} />
          <BotaoPrivacidade className={cn('rounded-md p-1.5 transition-colors',
            noPainel ? 'text-white hover:bg-white/15' : 'text-muted-foreground hover:bg-muted hover:text-foreground')} />
          <BotaoSair className={noPainel ? 'text-white hover:bg-white/15 hover:text-white' : undefined} />
        </div>
      </div>

      {/* mobile: bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-[var(--altura-nav)] border-t bg-card md:hidden">
        {itens.map(({ href, label, icon: Icon, tambem }) => (
          <Link key={href} href={href}
            className={cn('flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]',
              ativo(href, tambem) ? 'text-foreground font-medium' : 'text-muted-foreground')}>
            <Icon size={18} />{label}
          </Link>
        ))}
      </nav>
      {/* desktop: sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-44 flex-col border-r bg-card p-3 md:flex">
        <Logo className="mb-6 px-2" />
        {itens.map(({ href, label, icon: Icon, tambem }) => (
          <Link key={href} href={href}
            className={cn('flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm',
              ativo(href, tambem) ? 'bg-background font-medium' : 'text-muted-foreground hover:text-foreground')}>
            <Icon size={18} />{label}
          </Link>
        ))}
      </aside>
    </>
  )
}
