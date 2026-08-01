'use client'
import { useLoteriaFederal } from '@/lib/queries/loteria'
import { formatData } from '@/lib/format'
import { Skeleton } from '@/components/ui/skeleton'

const PREMIOS = ['1º', '2º', '3º', '4º', '5º']

/**
 * Os bilhetes da última extração da Federal.
 *
 * É o número que decide a contemplação por sorteio, então mora ao lado dos
 * números do mês — mas sem verde: não é dinheiro que o corretor recebe, e a
 * paleta reserva o verde para isso. Também não entra no modo privacidade,
 * porque resultado de loteria é público.
 */
export function LoteriaFederal() {
  const { data, isLoading, isError } = useLoteriaFederal()

  // fonte de apoio: indisponível, some da tela em vez de mostrar erro
  if (isError) return null

  if (isLoading || !data) {
    return (
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Loteria Federal</h2>
        <Skeleton className="h-40 w-full rounded-2xl" />
      </section>
    )
  }

  return (
    <section className="entra-suave space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">Loteria Federal</h2>
        <p className="text-xs text-muted-foreground">
          Extração {data.concurso} · {formatData(data.data)}
        </p>
      </div>

      <ol className="overflow-hidden rounded-2xl bg-card">
        {data.bilhetes.map((bilhete, i) => (
          <li key={bilhete + i}
            className="flex items-center justify-between border-b border-border/60 px-4 py-2.5 last:border-0">
            <span className="text-sm text-muted-foreground">{PREMIOS[i] ?? `${i + 1}º`} prêmio</span>
            <span className="font-mono text-lg font-semibold tabular-nums tracking-[0.12em]">
              {bilhete}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
