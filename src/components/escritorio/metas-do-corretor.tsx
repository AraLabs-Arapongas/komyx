'use client'
import { Target } from 'lucide-react'
import { useMinhasMetas } from '@/lib/queries/escritorio'
import { formatMesAno } from '@/lib/format'
import { BarraMeta } from '@/components/ui/barra-meta'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * As metas do mês, do lado de quem vende.
 *
 * O corretor de escritório não configura comissão — a política é da casa. O
 * que sobra para ele nesta tela não é um formulário, são os dois números que
 * o escritório definiu: quanto se espera dele e quanto se espera do time.
 *
 * A da casa vem em cartão neutro, e não em segundo hero: duas superfícies da
 * marca empilhadas competem, e quem abre a tela precisa saber num relance qual
 * das duas é a sua.
 */
export function MetasDoCorretor() {
  const { ano, mes } = mesAtual()
  const { data, isLoading } = useMinhasMetas(ano, mes)

  if (isLoading) return <Skeleton className="h-28 w-full rounded-lg" />
  if (!data) return null

  const minha = data.minhaMetaCentavos ?? 0
  const casa = data.metaCasaCentavos ?? 0
  if (minha <= 0 && casa <= 0) return null

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Target size={16} /> Metas de {formatMesAno(ano, mes)}
      </h2>

      {minha > 0 && (
        <BarraMeta titulo="Sua meta" realizadoCentavos={data.meuTotalCentavos} metaCentavos={minha}
          rodape={heranca(data.minhaVigenteDe, ano, mes)} />
      )}

      {casa > 0 && (
        <BarraMeta tom="card" titulo={`Meta do ${data.escritorio}`}
          realizadoCentavos={data.totalEscritorioCentavos} metaCentavos={casa}
          rodape={heranca(data.metaCasaVigenteDe, ano, mes)} />
      )}
    </section>
  )
}

function mesAtual(): { ano: number; mes: number } {
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
  const [ano, mes] = hoje.split('-').map(Number)
  return { ano, mes }
}

/**
 * Diz desde quando a meta vale, mas só quando ela vem de trás.
 *
 * A meta tem vigência: quem não mexeu continua com a de meses atrás. Sem esta
 * linha, o corretor lê o número e supõe que alguém o escolheu para agosto —
 * quando pode ser o de junho seguindo em frente.
 */
function heranca(vigenteDe: string | null, ano: number, mes: number): string | null {
  if (!vigenteDe) return null
  const [a, m] = vigenteDe.split('-').map(Number)
  if (a === ano && m === mes) return null
  return `Definida pelo escritório e em vigor desde ${formatMesAno(a, m).toLowerCase()}.`
}
