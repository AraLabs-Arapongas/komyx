'use client'
import { cva, type VariantProps } from 'class-variance-authority'
import { Valor } from '@/components/valor'
import { CurvaMarca } from '@/components/curva-marca'
import { cn } from '@/lib/utils'

/**
 * Quanto já foi vendido contra a meta do mês.
 *
 * Nasceu dentro do painel do dono e saiu de lá quando o corretor também passou
 * a ver metas: duas cópias da mesma barra divergiriam no primeiro ajuste — e é
 * a divergência que o design system existe para evitar.
 *
 * O que falta vem em dinheiro E em cotas: "faltam R$ 380 mil" é abstrato,
 * "cerca de 4 cotas" é o número de ligações que ainda cabem no mês.
 */
const barra = cva('relative overflow-hidden rounded-lg p-4', {
  variants: {
    tom: {
      /** o número da tela — hero da marca, texto branco */
      marca: 'superficie-marca-faixa text-white',
      /** um número entre outros — cartão neutro */
      card: 'border bg-card',
    },
  },
  defaultVariants: { tom: 'marca' },
})

export function BarraMeta({
  realizadoCentavos, metaCentavos, titulo, cartaMediaCentavos = 0, rodape, tom,
  mostrarAlvo = true, className,
}: VariantProps<typeof barra> & {
  realizadoCentavos: number
  metaCentavos: number
  /** rótulo curto acima do valor; sem ele, o valor abre o bloco */
  titulo?: string
  /**
   * Desliga o "X% de R$ Y" do topo. Serve para a tela que já diz o alvo logo
   * ao lado — no painel do dono ele está no KPI encostado na barra, e repetir
   * os mesmos três números a cem pixels de distância é ruído, não reforço.
   */
  mostrarAlvo?: boolean
  /** carta média do período: converte o que falta em número de cotas */
  cartaMediaCentavos?: number
  /** a linha de baixo — projeção, dia do mês, o que a tela tiver a dizer */
  rodape?: React.ReactNode
  className?: string
}) {
  const pct = metaCentavos > 0 ? Math.round(realizadoCentavos / metaCentavos * 100) : 0
  const falta = Math.max(0, metaCentavos - realizadoCentavos)
  const cotas = cartaMediaCentavos > 0 ? Math.ceil(falta / cartaMediaCentavos) : 0
  const sobreEscuro = (tom ?? 'marca') === 'marca'

  return (
    <section className={cn(barra({ tom }), className)}>
      {sobreEscuro && (
        <>
          <div aria-hidden className="brilho-marca pointer-events-none absolute inset-0" />
          <CurvaMarca />
        </>
      )}
      <div className="relative space-y-2">
        {/* o alvo aparece por extenso: sem ele a tela mostra o quanto já se
            vendeu e uma barra pela metade, sem dizer metade de quê */}
        {(titulo || mostrarAlvo) && (
          <div className={cn('flex flex-wrap items-baseline justify-between gap-x-3 text-xs',
            sobreEscuro ? 'text-white/75' : 'text-muted-foreground')}>
            {titulo && <p className="font-medium">{titulo}</p>}
            {mostrarAlvo && (
              <p className="ml-auto">
                {pct}% de <Valor centavos={metaCentavos} destaque={false}
                  className={cn('font-medium', sobreEscuro ? 'text-white/90' : 'text-foreground')} />
              </p>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <Valor centavos={realizadoCentavos} destaque={!sobreEscuro}
            className={cn('text-2xl md:text-3xl', sobreEscuro && 'text-white')} />
          <p className={cn('text-sm', sobreEscuro ? 'text-white/80' : 'text-muted-foreground')}>
            {falta > 0
              ? <>faltam <Valor centavos={falta} destaque={false}
                    className={cn('font-semibold', sobreEscuro && 'text-white')} />
                  {cotas > 0 && ` · cerca de ${cotas} cota${cotas === 1 ? '' : 's'}`}</>
              : 'meta batida'}
          </p>
        </div>
        {/* a barra continua desenhada no modo privacidade: a forma não é
            segredo, o número é — e é o Valor que sabe escondê-lo */}
        <div className={cn('h-2 overflow-hidden rounded-full', sobreEscuro ? 'bg-white/20' : 'bg-muted')}>
          <div className={cn('h-full rounded-full transition-all', sobreEscuro ? 'bg-money-claro' : 'bg-primary')}
            style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
        {rodape && (
          <p className={cn('text-xs', sobreEscuro ? 'text-white/75' : 'text-muted-foreground')}>
            {rodape}
          </p>
        )}
      </div>
    </section>
  )
}
