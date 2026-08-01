'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useDashboard } from '@/lib/queries/dashboard'
import { competenciaDaVenda, proximaCompetencia } from '@/lib/engine/calendario'
import { queryKeys } from '@/lib/queries/keys'
import { Valor } from '@/components/valor'
import { formatBRL, formatData } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'

function hojeSP(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}
const nomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export default function DashboardPage() {
  const { data: config } = useQuery({
    queryKey: queryKeys.config,
    queryFn: async () => {
      const { data, error } = await createClient().from('config_financeira')
        .select('*').eq('ativa', true).single()
      if (error) throw error
      return data
    },
  })
  const atual = config ? competenciaDaVenda(hojeSP(), config.dia_fechamento) : null
  const [ref, setRef] = useState<{ ano: number; mes: number } | null>(null)
  const comp = ref ?? atual
  const { data: d, isLoading } = useDashboard(comp?.ano ?? 0, comp?.mes ?? 0)

  if (!comp) return <Skeleton className="h-40 w-full" />
  const anterior = comp.mes === 1 ? { ano: comp.ano - 1, mes: 12 } : { ano: comp.ano, mes: comp.mes - 1 }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button onClick={() => setRef(anterior)}><ChevronLeft size={18} /></button>
          <h1 className="text-lg font-semibold">{nomes[comp.mes - 1]} {comp.ano}</h1>
          <button onClick={() => setRef(proximaCompetencia(comp))}><ChevronRight size={18} /></button>
        </div>
        <Button asChild><Link href="/app/vendas/nova"><Plus size={16} /> Nova venda</Link></Button>
      </div>

      {isLoading || !d ? <Skeleton className="h-64 w-full" /> : (
        <>
          <div className="rounded-[10px] border bg-card p-4">
            <p className="text-sm text-muted-foreground">Falta receber</p>
            <p className="text-3xl"><Valor centavos={d.comissaoPendenteCentavos} /></p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['Vendi no mês', formatBRL(d.totalVendidoCentavos), false],
              ['Comissão prevista', formatBRL(d.comissaoPrevistaCentavos), true],
              ['Já recebi', formatBRL(d.comissaoRecebidaCentavos), true],
              [`${d.nVendas} venda${d.nVendas === 1 ? '' : 's'}`, `Ticket ${formatBRL(d.ticketMedioCentavos)}`, false],
            ].map(([label, valor, verde], i) => (
              <div key={i} className="rounded-[10px] border bg-card p-3">
                <p className="text-xs text-muted-foreground">{label as string}</p>
                <p className={`text-lg font-semibold tabular-nums ${verde ? 'text-primary' : ''}`}>
                  {valor as string}</p>
              </div>
            ))}
          </div>
          {d.nVendas === 0 && (
            <div className="rounded-[10px] border p-6 text-center text-muted-foreground">
              Nenhuma venda neste mês ainda.
            </div>
          )}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground">Próximos recebimentos</h2>
              <Link href="/app/recebimentos" className="text-sm underline">ver todos</Link>
            </div>
            {d.proximos.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum recebimento previsto.</p>)}
            {d.proximos.map(p => (
              <div key={p.id} className="flex items-center justify-between rounded-[10px] border bg-card p-3 text-sm">
                <span>{p.cliente} · {formatData(p.data_prevista)}</span>
                <Valor centavos={p.valor_centavos} />
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  )
}
