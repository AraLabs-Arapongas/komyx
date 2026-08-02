'use client'
import { cn } from '@/lib/utils'

/**
 * A moldura das abas de lista: Vendas, Agenda e Clientes.
 *
 * As três respondem a mesma pergunta em formatos diferentes — o que existe, e
 * quanto isso vale — então abrem igual: título à esquerda, ação à direita, e um
 * cartão de aurora com o número que resume a tela. Antes cada uma montava esse
 * topo por conta própria: uma com resumo roxo chapado, outra com aurora, outra
 * sem resumo nenhum, e os três títulos com marcações diferentes.
 *
 * O painel de Início fica de fora de propósito: ele não é uma lista, é a
 * resposta direta de quanto entra neste mês, e o hero dele ocupa a tela inteira
 * em vez de encimar um conteúdo.
 */
export function LayoutAba({ titulo, acao, resumo, children, className }: {
  titulo: string
  /** botão da direita — normalmente o "novo alguma coisa" da tela */
  acao?: React.ReactNode
  /** conteúdo do cartão de aurora; sem ele o cartão não aparece */
  resumo?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-4', className)}>
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{titulo}</h1>
        {acao}
      </header>

      {resumo && (
        /* superficie-marca-faixa, e não a original: esta caixa é baixa e larga,
           e a aurora do hero comprime aqui — ver o comentário no globals.css */
        <section className="entra-suave superficie-marca-faixa relative overflow-hidden rounded-lg px-4 py-3.5 text-white">
          <div aria-hidden className="brilho-marca pointer-events-none absolute inset-0" />
          <div className="relative">{resumo}</div>
        </section>
      )}

      {children}
    </div>
  )
}

/** Um número dentro do cartão de aurora: rótulo pequeno em cima, valor embaixo. */
export function ResumoNumero({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-xs text-white/75">{rotulo}</p>
      <div className="mt-0.5 text-lg font-semibold md:text-2xl">{children}</div>
    </div>
  )
}
