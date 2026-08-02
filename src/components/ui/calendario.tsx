'use client'
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/*
 * Calendário de mês, em cima de nada.
 *
 * O Radix não tem calendário — tem Popover, que é o que este componente usa
 * para aparecer. Trazer o react-day-picker (o que o shadcn usa) custaria uma
 * dependência e, pior, ele fala `Date`: o resto do sistema trata data como
 * string 'YYYY-MM-DD' justamente para nunca esbarrar em fuso horário. Um
 * calendário que devolvesse `Date` reabriria essa porta na hora de gravar a
 * venda.
 *
 * Então aqui tudo é string. As contas de calendário usam Date.UTC, que é
 * aritmética pura e não depende do relógio de quem está olhando.
 */

const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] as const
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
] as const

function iso(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}
function diasNoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate()
}
/** Em que coluna cai o dia 1: 0 = domingo. */
function primeiraColuna(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes - 1, 1)).getUTCDay()
}

export function Calendario({ valor, hoje, onEscolher, className }: {
  /** data selecionada em ISO, ou null */
  valor: string | null
  /** hoje em ISO — vem de fora para o componente não ter opinião sobre fuso */
  hoje: string
  onEscolher: (iso: string) => void
  className?: string
}) {
  const base = valor ?? hoje
  const [ano, setAno] = useState(Number(base.slice(0, 4)))
  const [mes, setMes] = useState(Number(base.slice(5, 7)))

  function mudarMes(passo: -1 | 1) {
    const total = (ano * 12 + (mes - 1)) + passo
    setAno(Math.floor(total / 12))
    setMes((total % 12) + 1)
  }

  const total = diasNoMes(ano, mes)
  const vazios = primeiraColuna(ano, mes)

  return (
    <div className={cn('w-[17rem] select-none', className)}>
      <div className="mb-2 flex items-center justify-between">
        <button type="button" aria-label="Mês anterior" onClick={() => mudarMes(-1)}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <ChevronLeft size={18} />
        </button>
        <p className="text-sm font-medium" aria-live="polite">{MESES[mes - 1]} de {ano}</p>
        <button type="button" aria-label="Próximo mês" onClick={() => mudarMes(1)}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {DIAS_SEMANA.map((d, i) => (
          <span key={i} className="py-1 text-center text-[11px] font-medium text-muted-foreground">{d}</span>
        ))}
        {Array.from({ length: vazios }, (_, i) => <span key={`vazio-${i}`} />)}
        {Array.from({ length: total }, (_, i) => {
          const dia = i + 1
          const data = iso(ano, mes, dia)
          const selecionado = data === valor
          const eHoje = data === hoje
          return (
            <button
              key={dia}
              type="button"
              aria-label={`${dia} de ${MESES[mes - 1]} de ${ano}`}
              aria-current={eHoje ? 'date' : undefined}
              aria-pressed={selecionado}
              onClick={() => onEscolher(data)}
              className={cn(
                'flex size-9 items-center justify-center rounded-lg text-sm tabular-nums transition-colors',
                'hover:bg-muted',
                // hoje se marca por contorno; o preenchimento é do que está escolhido
                eHoje && !selecionado && 'ring-1 ring-inset ring-primary/40 font-medium',
                selecionado && 'bg-primary font-medium text-primary-foreground hover:bg-primary',
              )}
            >
              {dia}
            </button>
          )
        })}
      </div>
    </div>
  )
}
