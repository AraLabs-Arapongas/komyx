'use client'
import { formatBRL } from '@/lib/format'
import { cn } from '@/lib/utils'
import { usePrivacidade } from '@/components/privacidade'

/**
 * Dinheiro. Único lugar da interface que usa verde, e único que sabe esconder
 * valores quando o corretor liga o modo privacidade.
 */
export function Valor({ centavos, destaque = true, className }: {
  centavos: number; destaque?: boolean; className?: string
}) {
  const { oculto } = usePrivacidade()
  return (
    <span className={cn('tabular-nums font-semibold', destaque && 'text-money', className)}>
      {oculto ? (
        // mantém o "R$" para a linha não perder o sentido, e encolhe só os
        // dígitos escondidos — em 56px, seis bolinhas cheias ficariam enormes
        <>R$ <span className="text-[0.5em] tracking-[0.2em] align-middle">●●●●</span></>
      ) : formatBRL(centavos)}
    </span>
  )
}
