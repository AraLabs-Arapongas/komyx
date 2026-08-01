'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useDashboard } from '@/lib/queries/dashboard'
import { competenciaDaVenda, proximaCompetencia } from '@/lib/engine/calendario'
import { queryKeys } from '@/lib/queries/keys'
import { Valor } from '@/components/valor'
import { formatBRL, formatData, formatDataExtenso } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { BannerPagamento } from '@/components/banner-pagamento'
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react'

function hojeSP(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}
const nomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function pluralizar(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural
}

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
  const foraDoAtual = !!atual && (comp.ano !== atual.ano || comp.mes !== atual.mes)

  return (
    <div className="space-y-6">
      {d?.vencidos && <BannerPagamento vencidos={d.vencidos} hoje={hojeSP()} />}

      <header className="space-y-2">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setRef(anterior)}
              aria-label="Competência anterior"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ChevronLeft size={20} />
            </button>
            <CalendarDays className="shrink-0 text-muted-foreground" size={20} />
            <h1 className="text-xl font-bold tracking-tight md:text-3xl">
              Competência {nomes[comp.mes - 1]}/{comp.ano}
            </h1>
            <button
              onClick={() => setRef(proximaCompetencia(comp))}
              aria-label="Próxima competência"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ChevronRight size={20} />
            </button>
            {foraDoAtual && (
              <Button variant="ghost" size="sm" onClick={() => setRef(null)}>Hoje</Button>
            )}
          </div>
          <Button asChild className="w-full md:w-auto">
            <Link href="/app/vendas/nova"><Plus size={18} /> Nova venda</Link>
          </Button>
        </div>
        {d?.proximoPagamento && (
          <p className="text-sm text-muted-foreground">
            Próximo pagamento: {formatDataExtenso(d.proximoPagamento.data)} · {d.proximoPagamento.quantidade}{' '}
            {pluralizar(d.proximoPagamento.quantidade, 'recebimento previsto', 'recebimentos previstos')}
          </p>
        )}
      </header>

      {/* HERO — o dinheiro grita primeiro */}
      <section className="rounded-[10px] border bg-card p-6 md:p-8">
        {isLoading || !d ? <Skeleton className="h-28 w-full" /> : d.proximoPagamento ? (
          <>
            <p className="text-sm text-muted-foreground">Você receberá</p>
            <Valor
              centavos={d.proximoPagamento.totalCentavos}
              className="mt-1 block text-5xl md:text-6xl"
            />
            <p className="mt-2 text-sm text-muted-foreground">{formatDataExtenso(d.proximoPagamento.data)}</p>
          </>
        ) : (
          <>
            <p className="text-lg font-semibold">Nenhum recebimento previsto</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Assim que uma venda for confirmada, os recebimentos previstos aparecem aqui.
            </p>
          </>
        )}
      </section>

      {isLoading || !d ? <Skeleton className="h-24 w-full" /> : (
        <>
          {/* Resumo — hierarquia bem menor que o hero */}
          <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {/* volume vendido não é dinheiro do corretor: fica neutro para
                não competir com a comissão */}
            <div className="rounded-[10px] border bg-card p-3">
              <p className="text-xs text-muted-foreground">Vendido no mês</p>
              <Valor centavos={d.totalVendidoCentavos} destaque={false} className="mt-1 block text-lg" />
            </div>
            <div className="rounded-[10px] border bg-card p-3">
              <p className="text-xs text-muted-foreground">Comissão prevista</p>
              <Valor centavos={d.comissaoPrevistaCentavos} className="mt-1 block text-lg" />
            </div>
            <div className="rounded-[10px] border bg-card p-3">
              <p className="text-xs text-muted-foreground">Já recebi</p>
              <Valor centavos={d.comissaoRecebidaCentavos} className="mt-1 block text-lg" />
            </div>
            <div className="rounded-[10px] border bg-card p-3">
              <p className="text-xs text-muted-foreground">Ticket médio</p>
              <Valor centavos={d.ticketMedioCentavos} destaque={false} className="mt-1 block text-lg" />
              <p className="text-xs text-muted-foreground">
                em {d.nVendas} {pluralizar(d.nVendas, 'venda', 'vendas')}
              </p>
            </div>
          </section>

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

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground">Últimas vendas</h2>
              <Link href="/app/vendas" className="text-sm underline">ver todas</Link>
            </div>
            {d.ultimasVendas.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma venda confirmada nesta competência ainda.</p>)}
            {d.ultimasVendas.map(v => (
              <div key={v.id} className="flex items-center justify-between rounded-[10px] border bg-card p-3 text-sm">
                <div>
                  <p className="font-medium">{v.cliente || 'Cliente sem nome'}</p>
                  <p className="text-muted-foreground">
                    Carta <Valor centavos={v.valorCartaCentavos} destaque={false} className="font-normal" />
                  </p>
                </div>
                <Valor centavos={v.comissaoPrevistaCentavos} />
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  )
}
