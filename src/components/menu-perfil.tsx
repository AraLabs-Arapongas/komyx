'use client'
import Link from 'next/link'
import {
  ChevronRight, Settings, User, CreditCard, Building2, Download, FlaskConical, Target,
  type LucideIcon,
} from 'lucide-react'

type Contexto = {
  /** a política de comissão vem do escritório: a página de regras é leitura */
  politicaDoEscritorio?: boolean
  /** corretor de uma equipe — não o dono, que tem a área própria dele */
  ehMembro?: boolean
}

/**
 * Menu do perfil. É aqui que entram as próximas áreas do produto (relatórios,
 * integrações), sem disputar lugar na navegação de baixo.
 *
 * Os itens moram neste arquivo, e não na página, porque um ícone do Lucide é
 * uma função: não atravessa a fronteira servidor → cliente. Passar `icone={X}`
 * de uma página server quebra em runtime sem o typecheck acusar.
 */
const itens = ({ politicaDoEscritorio, ehMembro }: Contexto):
{ href: string; icone: LucideIcon; titulo: string; apoio: string }[] => [
  /*
   * Metas vêm primeiro, e só para quem está numa equipe.
   *
   * É o único item aqui que muda toda semana — os outros se abrem uma vez e
   * ficam meses parados. Quem vende sozinho não tem quem defina meta, então
   * para ele o item nem existe; o dono tem a página dele, com as de todos.
   */
  ...(ehMembro ? [{
    href: '/app/metas', icone: Target, titulo: 'Metas',
    apoio: 'A sua e a da equipe, neste mês',
  }] : []),
  /*
   * O primeiro item muda de nome conforme quem manda na política.
   *
   * Sob política de escritório a página não ajusta nada — mostra as regras e
   * as metas que a casa definiu. Chamá-la de "Ajustes" prometeria um botão de
   * salvar que não existe do outro lado do toque.
   */
  politicaDoEscritorio ? {
    href: '/app/configuracao', icone: Settings, titulo: 'Suas regras',
    apoio: 'Comissão, calendário e estorno do escritório',
  } : {
    href: '/app/configuracao', icone: Settings, titulo: 'Ajustes',
    apoio: 'Faixas de comissão, competência e estorno',
  },
  {
    href: '/app/perfil/conta', icone: User, titulo: 'Conta',
    apoio: 'Seus dados de contato e senha',
  },
  {
    href: '/app/perfil/assinatura', icone: CreditCard, titulo: 'Assinatura',
    apoio: 'Seu plano, cobrança e recibos',
  },
  // sempre visível, mesmo para quem não tem equipe: a própria página vira o
  // convite para criar uma
  {
    href: '/app/escritorio', icone: Building2, titulo: 'Escritório',
    apoio: 'Sua equipe num painel só',
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

export function MenuPerfil({ politicaDoEscritorio = false, ehMembro = false }: Contexto) {
  return (
    <nav className="divide-y overflow-hidden rounded-lg bg-card">
      {itens({ politicaDoEscritorio, ehMembro }).map(({ href, icone: Icone, titulo, apoio }) => (
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
