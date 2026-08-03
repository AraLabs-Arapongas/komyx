'use client'
import { AvatarInicial } from '@/components/ui/avatar-inicial'
import { horaCurta } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Compromisso } from '@/lib/queries/compromissos'

/*
 * A grade do mês.
 *
 * Tudo em string 'YYYY-MM-DD' e Date.UTC, como o resto do sistema: calendário
 * que fala `Date` reabre a porta do fuso horário, e o dia 1º vira dia 31 do
 * mês anterior para quem está em São Paulo às nove da noite.
 */

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const

function iso(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Os 42 dias da grade: seis semanas completas, começando no domingo.
 *
 * Sempre 42, mesmo quando o mês cabe em cinco linhas. Uma grade que muda de
 * altura faz a página inteira pular ao trocar de mês, e o clique seguinte cai
 * no lugar errado.
 */
export function diasDaGrade(ano: number, mes: number): string[] {
  const primeiro = new Date(Date.UTC(ano, mes - 1, 1))
  const inicio = new Date(primeiro)
  inicio.setUTCDate(1 - primeiro.getUTCDay())
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(inicio)
    d.setUTCDate(inicio.getUTCDate() + i)
    return iso(d)
  })
}

export function GradeMes({
  ano, mes, hoje, selecionado, compromissos, euId, nomePorId, aoSelecionar, aoAbrir,
}: {
  ano: number
  mes: number
  hoje: string
  selecionado: string
  compromissos: Compromisso[]
  euId: string
  nomePorId: Map<string, string>
  aoSelecionar: (data: string) => void
  aoAbrir: (c: Compromisso) => void
}) {
  const dias = diasDaGrade(ano, mes)
  const porDia = new Map<string, Compromisso[]>()
  for (const c of compromissos) {
    porDia.set(c.data, [...(porDia.get(c.data) ?? []), c])
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="grid grid-cols-7 border-b">
        {DIAS_SEMANA.map(d => (
          <span key={d} className="py-2 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {dias.map((data, i) => {
          const doMes = Number(data.slice(5, 7)) === mes
          const eHoje = data === hoje
          const escolhido = data === selecionado
          const doDia = porDia.get(data) ?? []
          // três cabem na célula sem esticar a linha; o resto vira "+N", que é
          // o que o painel do dia embaixo mostra por inteiro
          const cabem = doDia.slice(0, 3)

          return (
            <button
              key={data}
              type="button"
              onClick={() => aoSelecionar(data)}
              aria-label={`${Number(data.slice(8, 10))} de ${data.slice(5, 7)}`}
              aria-pressed={escolhido}
              className={cn(
                'flex min-h-20 flex-col gap-1 border-b border-r p-1.5 text-left transition-colors md:min-h-28',
                // a última coluna e a última linha não precisam de borda externa
                i % 7 === 6 && 'border-r-0',
                i >= 35 && 'border-b-0',
                doMes ? 'hover:bg-muted/60' : 'bg-muted/25 hover:bg-muted/40',
                escolhido && 'bg-primary/5 hover:bg-primary/10',
              )}
            >
              <span className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full text-xs tabular-nums',
                !doMes && 'text-muted-foreground/60',
                eHoje && 'bg-primary font-semibold text-primary-foreground',
                escolhido && !eHoje && 'font-semibold text-primary',
              )}>
                {Number(data.slice(8, 10))}
              </span>

              <span className="flex min-w-0 flex-col gap-0.5">
                {cabem.map(c => (
                  <span
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    onClick={e => { e.stopPropagation(); aoAbrir(c) }}
                    onKeyDown={e => {
                      if (e.key !== 'Enter' && e.key !== ' ') return
                      e.preventDefault(); e.stopPropagation(); aoAbrir(c)
                    }}
                    className={cn(
                      'flex min-w-0 items-center gap-1 rounded px-1 py-0.5 text-[11px] leading-tight',
                      c.concluidoEm
                        ? 'bg-muted text-muted-foreground line-through'
                        : c.data < hoje
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-primary/10 text-primary',
                    )}
                  >
                    {c.hora && <span className="shrink-0 tabular-nums">{horaCurta(c.hora)}</span>}
                    <span className="truncate">{c.titulo}</span>
                    {c.corretorId !== euId && nomePorId.get(c.corretorId) && (
                      <AvatarInicial nome={nomePorId.get(c.corretorId)!}
                        className="ml-auto size-3.5 shrink-0 text-[7px]" />
                    )}
                  </span>
                ))}
                {doDia.length > cabem.length && (
                  <span className="px-1 text-[11px] text-muted-foreground">
                    +{doDia.length - cabem.length}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
