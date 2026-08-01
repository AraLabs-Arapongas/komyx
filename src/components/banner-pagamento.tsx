'use client'
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { marcarRecebidosVencidos } from '@/lib/actions/vendas'
import { Valor } from '@/components/valor'
import { Button } from '@/components/ui/button'
import { formatDataExtenso } from '@/lib/format'
import { Wallet } from 'lucide-react'
import type { Vencidos } from '@/lib/queries/dashboard'

const CHAVE_DISPENSADO = 'consorpro:banner-pagamento-dispensado'

function pluralizar(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural
}

export function BannerPagamento({ vencidos, hoje }: { vencidos: Vencidos; hoje: string }) {
  const qc = useQueryClient()
  const [dispensadoHoje, setDispensadoHoje] = useState(true)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    setDispensadoHoje(localStorage.getItem(CHAVE_DISPENSADO) === hoje)
  }, [hoje])

  if (dispensadoHoje) return null

  async function confirmar() {
    setEnviando(true)
    const r = await marcarRecebidosVencidos(hoje)
    setEnviando(false)
    if (!r.ok) { toast.error(r.erro); return }
    toast.success(
      `${r.quantidade} ${pluralizar(r.quantidade, 'parcela confirmada', 'parcelas confirmadas')} como recebida${r.quantidade === 1 ? '' : 's'}.`
    )
    qc.invalidateQueries()
  }

  function dispensar() {
    localStorage.setItem(CHAVE_DISPENSADO, hoje)
    setDispensadoHoje(true)
  }

  return (
    <div className="rounded-[10px] border border-money/30 bg-money-soft p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold">
            Você recebeu <Valor centavos={vencidos.totalCentavos} className="text-lg" />?
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {vencidos.quantidade} {pluralizar(vencidos.quantidade, 'parcela prevista', 'parcelas previstas')} até
            hoje, {formatDataExtenso(vencidos.ate)}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={dispensar} disabled={enviando}>
            Agora não
          </Button>
          <Button onClick={confirmar} disabled={enviando}>
            <Wallet size={18} /> Sim, recebi
          </Button>
        </div>
      </div>
    </div>
  )
}
