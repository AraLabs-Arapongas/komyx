'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Clock, CreditCard } from 'lucide-react'
import { temAvisoDeAssinatura, type Acesso } from '@/lib/assinatura/acesso'

const DESTINO = '/app/perfil/assinatura'

/**
 * A tarja que avisa antes de o app fechar a porta.
 *
 * Dois casos, e nenhum deles é surpresa: o teste está acabando, ou o cartão
 * recusou e o Stripe ainda está tentando. Nos dois, o corretor tem alguns dias
 * para agir — e é a diferença entre resolver com calma e descobrir na segunda
 * de manhã que o app não abre.
 *
 * Fora desses dois casos não renderiza nada. É de propósito que a decisão more
 * aqui, e não no layout: assim o layout não precisa saber quais estados de
 * assinatura merecem tarja.
 */
export function AvisoAssinatura({ acesso }: { acesso: Acesso }) {
  const pathname = usePathname()
  if (!temAvisoDeAssinatura(acesso)) return null
  // na própria tela de assinatura a tarja repetiria, palavra por palavra, o
  // que já está no cartão logo abaixo dela
  if (pathname === DESTINO) return null

  const cobrancaFalhou = acesso.liberado && acesso.motivo === 'cobranca_falhou'
  const Icone = cobrancaFalhou ? CreditCard : Clock
  const dias = acesso.liberado && acesso.motivo === 'teste' ? acesso.diasRestantes : 0

  return (
    <Link
      href={DESTINO}
      className="entra-suave mb-4 flex items-center gap-3 rounded-lg border border-[#F59E0B]/40
                 bg-[#F59E0B]/10 px-3 py-2.5 text-sm transition-colors hover:bg-[#F59E0B]/15"
    >
      <Icone size={18} className="shrink-0 text-[#B45309]" />
      <span className="min-w-0 flex-1">
        {cobrancaFalhou ? (
          <>
            <span className="font-medium">Não conseguimos cobrar seu cartão.</span>{' '}
            <span className="text-muted-foreground">Atualize os dados para não perder o acesso.</span>
          </>
        ) : (
          <>
            <span className="font-medium">
              {/* "1 dia" pode ser 2 horas ou 23: dizer as horas evita prometer
                  um dia inteiro que não existe */}
              {dias === 1 ? 'Seu teste acaba em menos de 24 horas.' : `Seu teste acaba em ${dias} dias.`}
            </span>{' '}
            <span className="text-muted-foreground">Assine para continuar sem interrupção.</span>
          </>
        )}
      </span>
      <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
    </Link>
  )
}
