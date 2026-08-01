'use client'
import Link from 'next/link'
import { useLoteriaFederal } from '@/lib/queries/loteria'
import { useCotasAtivas, type CotaAtiva } from '@/lib/queries/sorteio'
import { conferirCota } from '@/lib/engine/sorteio'
import { formatData } from '@/lib/format'
import { Skeleton } from '@/components/ui/skeleton'
import { Sparkles } from 'lucide-react'

const PREMIOS = ['1º', '2º', '3º', '4º', '5º']

/** Quais cotas do corretor batem com cada prêmio da extração. */
function cotasPorPremio(cotas: CotaAtiva[], bilhetes: string[]): Map<number, CotaAtiva[]> {
  const mapa = new Map<number, CotaAtiva[]>()
  for (const cota of cotas) {
    for (const acerto of conferirCota(cota.cota, bilhetes)) {
      mapa.set(acerto.premio, [...(mapa.get(acerto.premio) ?? []), cota])
    }
  }
  return mapa
}

function descrever(cotas: CotaAtiva[]): string {
  const nomes = cotas.map(c => `${c.cliente} (G${c.grupo} · C${c.cota})`).join(', ')
  return `${nomes} — a regra de sorteio muda por administradora, confirme antes de avisar o cliente.`
}

/**
 * Os bilhetes da última extração da Federal.
 *
 * É o número que decide a contemplação por sorteio, então mora ao lado dos
 * números do mês — mas sem verde nos bilhetes: não é dinheiro que o corretor
 * recebe, e a paleta reserva o verde para isso. Também não entra no modo
 * privacidade, porque resultado de loteria é público.
 */
export function LoteriaFederal() {
  const { data, isLoading, isError } = useLoteriaFederal()
  const { data: cotas } = useCotasAtivas()

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

  const acertos = cotasPorPremio(cotas ?? [], data.bilhetes)

  return (
    <section className="entra-suave min-w-0 space-y-3">
      {/* em meia tela o rótulo da extração não cabe ao lado do título */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <h2 className="text-sm font-medium text-muted-foreground">Loteria Federal</h2>
        <p className="text-xs text-muted-foreground">
          Extração {data.concurso} · {formatData(data.data)}
        </p>
      </div>

      <ol className="overflow-hidden rounded-2xl bg-card">
        {data.bilhetes.map((bilhete, i) => {
          const doPremio = acertos.get(i + 1)
          const numero = (
            <span className="font-mono text-base font-semibold tabular-nums tracking-[0.08em] md:text-lg md:tracking-[0.12em]">
              {bilhete}
            </span>
          )
          return (
            <li key={bilhete + i}
              className="flex items-center justify-between gap-2 border-b border-border/60
                         px-3 py-2.5 last:border-0 md:px-4">
              <span className="text-xs text-muted-foreground md:text-sm">{PREMIOS[i] ?? `${i + 1}º`}</span>
              {doPremio ? (
                /* uma cota bateu: a linha leva à venda e o título nomeia o
                   cliente. Só um sinal para conferir — quem decide a
                   contemplação é a administradora, com a regra dela. */
                <Link
                  href={doPremio.length === 1 ? `/app/vendas/${doPremio[0].vendaId}` : '/app/vendas'}
                  title={descrever(doPremio)}
                  className="flex items-center gap-1.5 rounded-lg text-money hover:underline"
                >
                  <Sparkles size={16} className="shrink-0" />
                  {numero}
                </Link>
              ) : numero}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
