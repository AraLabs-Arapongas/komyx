'use client'
import { useId } from 'react'
import { cn } from '@/lib/utils'
import { formatBRL } from '@/lib/format'
import { usePrivacidade } from '@/components/privacidade'

/**
 * Gráficos do painel do dono.
 *
 * SVG à mão, e não biblioteca: o produto desenha a própria identidade — a
 * aurora, a curva, a onda do hero são todas feitas aqui — e um pacote de
 * gráficos traria noventa kilobytes para desenhar retas e barras com cara de
 * qualquer outro sistema.
 *
 * Todos respeitam o modo privacidade: o corretor abre o app em reunião, e o
 * dono abre na frente da equipe. Escondido, a barra continua desenhada (a
 * forma não é segredo) e o número vira bolinha.
 */

/** Um mês na série. Valores sempre em centavos. */
export type PontoMes = { ano: number; mes: number; centavos: number }

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez']

export function rotuloMes(p: { ano: number; mes: number }): string {
  return MESES_CURTOS[p.mes - 1]
}

function useValorVisivel() {
  const { oculto } = usePrivacidade()
  return (centavos: number) => (oculto ? 'R$ ●●●●' : formatBRL(centavos))
}

/**
 * Barras verticais por mês, com a meta como linha tracejada.
 *
 * A meta é linha e não barra de propósito: ela não é uma medida ao lado das
 * outras, é o corte que separa o mês bom do ruim — e a linha atravessando as
 * colunas responde "passou ou não" sem ninguém comparar alturas.
 */
export function GraficoMeses({ pontos, metaCentavos, className }: {
  pontos: PontoMes[]
  metaCentavos?: number | null
  className?: string
}) {
  const mostrar = useValorVisivel()
  const teto = Math.max(...pontos.map(p => p.centavos), metaCentavos ?? 0, 1)
  const ultimo = pontos.length - 1

  return (
    <div className={cn('space-y-2', className)}>
      <div className="relative flex h-40 items-end gap-1.5">
        {metaCentavos != null && metaCentavos > 0 && (
          <div aria-hidden className="pointer-events-none absolute inset-x-0 border-t border-dashed border-money/70"
            style={{ bottom: `${metaCentavos / teto * 100}%` }}>
            <span className="absolute -top-2 right-0 -translate-y-full bg-card px-1 text-[10px] font-medium text-money">meta</span>
          </div>
        )}
        {pontos.map((p, i) => (
          /* h-full: sem base, a altura percentual da barra resolve para zero e
             o gráfico desenha só os rótulos */
          <div key={`${p.ano}-${p.mes}`} className="group relative flex h-full flex-1 flex-col justify-end">
            {/* o valor só aparece no hover: doze rótulos permanentes viram
                ruído e o gráfico deixa de ser lido pela forma */}
            <span className="pointer-events-none absolute -top-5 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap
                             rounded bg-foreground px-1.5 py-0.5 text-[10px] font-medium text-background
                             opacity-0 transition-opacity group-hover:opacity-100">
              {mostrar(p.centavos)}
            </span>
            {/* teto de largura: com dois ou três meses na série, barras
                elásticas viram blocos que ocupam meia tela e o gráfico deixa
                de parecer gráfico */}
            <div
              className={cn('mx-auto w-full max-w-14 rounded-t transition-colors',
                i === ultimo ? 'bg-primary' : 'bg-primary/30 group-hover:bg-primary/50')}
              style={{ height: `${Math.max(p.centavos / teto * 100, p.centavos > 0 ? 2 : 0)}%` }} />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5">
        {pontos.map((p, i) => (
          <span key={`${p.ano}-${p.mes}`}
            className={cn('flex-1 text-center text-[10px]',
              i === ultimo ? 'font-medium text-foreground' : 'text-muted-foreground')}>
            {rotuloMes(p)}
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * Uma linha por corretor ao longo dos meses: quem sobe e quem cai.
 *
 * Sem eixo Y e sem grade — a pergunta aqui é de direção, não de valor. Quem
 * quer o número exato tem a lista de corretores logo acima.
 */
export function GraficoLinhas({ series, meses, className }: {
  series: { nome: string; pontos: PontoMes[] }[]
  meses: { ano: number; mes: number }[]
  className?: string
}) {
  const id = useId()
  // 8% de folga no topo: sem ela o pico encosta na borda e a linha parece
  // vazar do cartão
  const teto = Math.max(...series.flatMap(s => s.pontos.map(p => p.centavos)), 1) * 1.08
  const largura = 100
  const altura = 42

  // tons da marca; nenhum verde, que aqui é dinheiro recebido, não corretor
  const CORES = ['#6C5CE7', '#00C2FF', '#8F7BFF', '#4E7BFF', '#5A2FD0', '#00A8E8']

  function caminho(pontos: PontoMes[]): string {
    if (pontos.length < 2) return ''
    return pontos.map((p, i) => {
      const x = (i / (pontos.length - 1)) * largura
      const y = altura - (p.centavos / teto) * altura
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
    }).join(' ')
  }

  return (
    <div className={cn('space-y-2', className)}>
      <svg viewBox={`0 0 ${largura} ${altura}`} preserveAspectRatio="none"
        className="h-36 w-full" role="img"
        aria-label="Produção de cada corretor nos últimos meses">
        {series.map((s, i) => (
          <path key={`${id}-${s.nome}`} d={caminho(s.pontos)} fill="none"
            stroke={CORES[i % CORES.length]} strokeWidth="1.2"
            strokeLinecap="round" strokeLinejoin="round"
            vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <div className="flex gap-1.5">
        {meses.map(m => (
          <span key={`${m.ano}-${m.mes}`} className="flex-1 text-center text-[10px] text-muted-foreground">
            {rotuloMes(m)}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {series.map((s, i) => (
          <span key={s.nome} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2 shrink-0 rounded-full" style={{ background: CORES[i % CORES.length] }} />
            {s.nome.split(' ')[0]}
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * Composição: barras horizontais com o rótulo dentro da linha.
 *
 * Horizontal e não rosca porque os rótulos são nomes de administradora, que
 * não cabem em fatia — e comparar comprimento é mais fácil que comparar
 * ângulo.
 */
export function GraficoComposicao({ linhas, className }: {
  linhas: { rotulo: string; centavos: number; nVendas: number }[]
  className?: string
}) {
  const mostrar = useValorVisivel()
  const teto = Math.max(...linhas.map(l => l.centavos), 1)

  return (
    <div className={cn('space-y-2.5', className)}>
      {linhas.map(l => (
        <div key={l.rotulo} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium">{l.rotulo || 'Sem produto'}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {l.nVendas} · <span className="tabular-nums text-foreground">{mostrar(l.centavos)}</span>
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary"
              style={{ width: `${Math.max(l.centavos / teto * 100, 2)}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}
