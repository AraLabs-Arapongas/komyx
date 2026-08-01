'use client'
import { Valor } from '@/components/valor'
import { formatDataExtenso } from '@/lib/format'

/** Celebração do momento "aha": mostrar depois que o corretor cadastra a primeira venda pós-onboarding. Componente pronto, ainda não integrado a nenhum fluxo. */
export function PrimeiraComissao({ valorCentavos, dataPrevista, aoFechar }: {
  valorCentavos: number
  dataPrevista: string
  aoFechar: () => void
}) {
  return (
    <div className="entra-suave fixed inset-0 z-50 flex items-center justify-center bg-escuro/80 p-4">
      <div className="entra w-full max-w-sm space-y-5 rounded-2xl bg-escuro p-8 text-center text-white">
        <p className="text-4xl">🎉</p>
        <h2 className="text-2xl font-semibold sm:text-3xl">Sua primeira comissão foi calculada.</h2>
        <div className="py-1">
          <Valor centavos={valorCentavos} className="text-4xl text-money-claro" />
        </div>
        <p className="text-escuro-texto">você recebe em {formatDataExtenso(dataPrevista)}</p>
        <button
          type="button"
          onClick={aoFechar}
          className="mt-2 h-11 w-full rounded-lg bg-money-claro font-medium text-escuro transition-colors hover:bg-money-claro/90"
        >
          Entendi
        </button>
      </div>
    </div>
  )
}
