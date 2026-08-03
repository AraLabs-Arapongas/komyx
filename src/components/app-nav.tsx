'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ShoppingBag, Wallet, Users, CircleUser, CalendarCheck,
  Building2, UsersRound, SlidersHorizontal, Target,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/logo'
import { BotaoPrivacidade } from '@/components/privacidade'
import { BuscaGlobal } from '@/components/busca-global'
import { BotaoSair } from '@/components/botao-sair'

/*
 * `curto` existe por causa da barra de baixo.
 *
 * São seis itens em 375px — 62px por célula — e "Recebimentos" não cabe nisso.
 * Encolher o texto no celular é melhor que tirar uma tela da barra: quem não
 * tem porta na navegação não descobre a tela, e "A receber" diz a mesma coisa
 * para quem está com o polegar em cima do ícone de carteira.
 */
const itens = [
  { href: '/app', label: 'Início', icon: LayoutDashboard },
  { href: '/app/vendas', label: 'Vendas', icon: ShoppingBag },
  { href: '/app/agenda', label: 'Agenda', icon: CalendarCheck },
  /*
   * "Recebimentos", e não "Agenda": a palavra agenda é dos compromissos —
   * ligar para o cliente, ir ao escritório. Duas telas com o mesmo nome, uma
   * de dinheiro e outra de tarefas, seria o pior lugar possível para o
   * corretor errar o toque.
   */
  { href: '/app/recebimentos', label: 'Recebimentos', curto: 'A receber', icon: Wallet },
  { href: '/app/clientes', label: 'Clientes', icon: Users },
  // Ajustes mora dentro do perfil: a aba segue acesa quando o corretor está lá,
  // senão ele fica sem referência de onde está na navegação
  { href: '/app/perfil', label: 'Perfil', icon: CircleUser, tambem: ['/app/configuracao'] },
]

/*
 * A lateral do dono tem outra prioridade: o escritório em cima, a carteira
 * pessoal dele agrupada embaixo. Ele quase não vende — abrir o app é olhar a
 * equipe, e o menu tem que dizer isso antes de qualquer clique.
 *
 * No celular a barra de baixo continua a mesma para todos: cinco itens é o
 * limite do polegar, e o painel do dono já leva aos atalhos que ele precisa.
 */
const itensEscritorio = [
  { href: '/app', label: 'Painel', icon: Building2, exato: true },
  { href: '/app/escritorio/equipe', label: 'Equipe', icon: UsersRound },
  { href: '/app/escritorio/metas', label: 'Metas', icon: Target },
  { href: '/app/escritorio/politicas', label: 'Políticas', icon: SlidersHorizontal },
]

/** A carteira do dono: as telas que ele usa só se também vender. */
const itensPessoais = itens.filter(i => i.href !== '/app')

export function AppNav({ ehDono = false }: { ehDono?: boolean }) {
  const path = usePathname()
  /*
   * A aurora encosta no topo só no painel do corretor. O do dono é um
   * dashboard de blocos claros — cabeçalho transparente ali deixaria os ícones
   * brancos sobre fundo branco, que foi o mesmo defeito da busca global.
   */
  const noPainel = path === '/app' && !ehDono
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
        'sticky top-0 z-30 flex items-center justify-between gap-2 px-4 md:justify-end md:pl-48',
        noPainel ? 'h-[var(--altura-cabecalho-painel)]' : 'h-[var(--altura-cabecalho)] py-2.5',
        noPainel ? 'border-b border-transparent bg-transparent text-white' : 'border-b bg-card',
      )}>
        <Logo className="md:hidden" sobreEscuro={noPainel} tamanho={noPainel ? 'grande' : 'padrao'} />
        <div className="flex items-center gap-1">
          <BuscaGlobal className={noPainel ? 'text-white hover:bg-white/15 hover:text-white' : undefined} />
          <BotaoPrivacidade className={cn('rounded-md p-1.5 transition-colors',
            noPainel ? 'text-white hover:bg-white/15' : 'text-muted-foreground hover:bg-muted hover:text-foreground')} />
          <BotaoSair className={noPainel ? 'text-white hover:bg-white/15 hover:text-white' : undefined} />
        </div>
      </div>

      {/* mobile: bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-[var(--altura-nav)] border-t bg-card md:hidden">
        {itens.map(({ href, label, curto, icon: Icon, tambem }) => (
          <Link key={href} href={href}
            className={cn('flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px]',
              ativo(href, tambem) ? 'text-foreground font-medium' : 'text-muted-foreground')}>
            <Icon size={18} />{curto ?? label}
          </Link>
        ))}
      </nav>
      {/* desktop: sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-44 flex-col border-r bg-card p-3 md:flex">
        <Logo className="mb-6 px-2" />
        {ehDono ? (
          <>
            {itensEscritorio.map(({ href, label, icon: Icon, exato }) => (
              <Link key={href} href={href}
                className={cn('flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm',
                  (exato ? path === href : path.startsWith(href))
                    ? 'bg-background font-medium' : 'text-muted-foreground hover:text-foreground')}>
                <Icon size={18} />{label}
              </Link>
            ))}
            <p className="mb-1 mt-6 px-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Minha carteira
            </p>
            {itensPessoais.map(({ href, label, icon: Icon, tambem }) => (
              <Link key={href} href={href}
                className={cn('flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm',
                  ativo(href, tambem) ? 'bg-background font-medium' : 'text-muted-foreground hover:text-foreground')}>
                <Icon size={18} />{label}
              </Link>
            ))}
          </>
        ) : (
          itens.map(({ href, label, icon: Icon, tambem }) => (
            <Link key={href} href={href}
              className={cn('flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm',
                ativo(href, tambem) ? 'bg-background font-medium' : 'text-muted-foreground hover:text-foreground')}>
              <Icon size={18} />{label}
            </Link>
          ))
        )}
      </aside>
    </>
  )
}
