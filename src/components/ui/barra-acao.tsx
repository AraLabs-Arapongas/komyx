'use client'
import { cn } from '@/lib/utils'

/**
 * A barra de ação de um formulário, colada no pé da tela.
 *
 * Fica logo acima do menu, no alcance do polegar, e sempre visível — sem
 * depender de o formulário ter conteúdo suficiente para empurrá-la até lá. O
 * recuo sai da mesma variável que dimensiona o menu; quando esse número morava
 * solto, sobrava folga entre o botão e o menu.
 *
 * As margens negativas sangram sobre o padding da página para o fundo da barra
 * encostar de fato no menu, em vez de parar antes com uma faixa de background
 * atrás.
 *
 * Para a barra encostar no pé, quem usa precisa dar altura à coluna: a página
 * fica `flex min-h-[calc(100dvh-var(--altura-cabecalho)-var(--altura-nav)-2rem)]
 * flex-col` e o formulário, `flex-1`.
 */
export function BarraAcao({ className, children }: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn(
      'sticky bottom-[var(--altura-nav)] z-20 -mx-4 -mb-4 mt-6 flex gap-3 bg-background px-4 pb-4 pt-3',
      'md:bottom-0 md:-mx-6 md:-mb-6 md:px-6',
      className,
    )}>
      {children}
    </div>
  )
}
