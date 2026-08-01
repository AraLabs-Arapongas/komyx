import { cn } from '@/lib/utils'

/**
 * Marca do ConsorPro: símbolo neutro em grafite. O verde nunca aparece aqui —
 * na interface ele significa dinheiro, e só.
 *
 * O símbolo é um "C" aberto formado por duas barras que sobem, sugerindo
 * evolução financeira sem recorrer a um gráfico literal.
 */
export function LogoSimbolo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn('size-6', className)}>
      <rect width="24" height="24" rx="6" className="fill-foreground" />
      <rect x="7" y="12" width="3.2" height="6" rx="1.6" className="fill-background" />
      <rect x="13.8" y="6" width="3.2" height="12" rx="1.6" className="fill-background" />
    </svg>
  )
}

export function Logo({ className, mostrarNome = true }: {
  className?: string
  mostrarNome?: boolean
}) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoSimbolo />
      {mostrarNome && (
        <span className="text-base font-bold tracking-tight">ConsorPro</span>
      )}
    </span>
  )
}
