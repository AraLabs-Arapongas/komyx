import { formatBRL } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Dinheiro. O verde é exclusivo daqui — nenhum outro elemento da interface o usa. */
export function Valor({ centavos, destaque = true, className }: {
  centavos: number; destaque?: boolean; className?: string
}) {
  return (
    <span className={cn('tabular-nums font-semibold', destaque && 'text-money', className)}>
      {formatBRL(centavos)}
    </span>
  )
}
