import { formatBRL } from '@/lib/format'
import { cn } from '@/lib/utils'

export function Valor({ centavos, destaque = true, className }: {
  centavos: number; destaque?: boolean; className?: string
}) {
  return (
    <span className={cn('tabular-nums font-semibold', destaque && 'text-primary', className)}>
      {formatBRL(centavos)}
    </span>
  )
}
