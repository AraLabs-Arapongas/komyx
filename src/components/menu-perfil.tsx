'use client'
import Link from 'next/link'
import { ChevronRight, Settings, User, Download, FlaskConical, type LucideIcon } from 'lucide-react'

/**
 * Menu do perfil. É aqui que entram as próximas áreas do produto (relatórios,
 * integrações), sem disputar lugar na navegação de baixo.
 *
 * Os itens moram neste arquivo, e não na página, porque um ícone do Lucide é
 * uma função: não atravessa a fronteira servidor → cliente. Passar `icone={X}`
 * de uma página server quebra em runtime sem o typecheck acusar.
 */
const ITENS: { href: string; icone: LucideIcon; titulo: string; apoio: string }[] = [
  {
    href: '/app/configuracao', icone: Settings, titulo: 'Ajustes',
    apoio: 'Faixas de comissão, competência e estorno',
  },
  {
    href: '/app/perfil/conta', icone: User, titulo: 'Conta',
    apoio: 'Seus dados de contato e senha',
  },
  {
    href: '/app/perfil/backup', icone: Download, titulo: 'Backup',
    apoio: 'Baixe uma cópia dos seus dados',
  },
  // NODE_ENV é substituído em tempo de build, então o item nem chega ao pacote
  // de produção
  ...(process.env.NODE_ENV !== 'production' ? [{
    href: '/app/perfil/dev', icone: FlaskConical, titulo: 'Desenvolvimento',
    apoio: 'Refazer onboarding e pré-visualizar telas',
  }] : []),
]

export function MenuPerfil() {
  return (
    <nav className="divide-y overflow-hidden rounded-lg bg-card">
      {ITENS.map(({ href, icone: Icone, titulo, apoio }) => (
        <Link key={href} href={href}
          className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <Icone size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">{titulo}</span>
            <span className="block truncate text-xs text-muted-foreground">{apoio}</span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
        </Link>
      ))}
    </nav>
  )
}
