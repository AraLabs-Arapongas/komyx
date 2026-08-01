'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useVendas } from '@/lib/queries/vendas'
import { formatBRL } from '@/lib/format'
import { Valor } from '@/components/valor'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus } from 'lucide-react'

const statusLabel: Record<string, string> = {
  confirmada: 'Confirmada', cancelada: 'Cancelada', estornada: 'Estornada',
  rascunho: 'Rascunho', arquivada: 'Arquivada',
}

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

type ComissaoResumo = {
  valor_centavos: number
  percentual: number
  status: string
  recebimentos: { data_prevista: string; status: string }[]
} | null

/** Mês da primeira parcela ainda prevista, ou "—" se não houver. */
function receberaEm(comissao: ComissaoResumo): string {
  if (!comissao) return '—'
  const previstos = comissao.recebimentos.filter(r => r.status === 'previsto')
  if (previstos.length === 0) return '—'
  const menor = previstos.reduce((m, r) => (r.data_prevista < m ? r.data_prevista : m), previstos[0].data_prevista)
  const mes = Number(menor.slice(5, 7))
  return MESES[mes - 1] ?? '—'
}

export default function VendasPage() {
  const [busca, setBusca] = useState('')
  const { data: vendas, isLoading } = useVendas(busca)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Vendas</h1>
        <Button asChild><Link href="/app/vendas/nova"><Plus size={18} /> Nova venda</Link></Button>
      </div>
      <Input placeholder="Buscar por cliente, grupo, cota ou administradora…"
        value={busca} onChange={e => setBusca(e.target.value)} />
      {isLoading && <Skeleton className="h-24 w-full" />}
      {!isLoading && (vendas ?? []).length === 0 && (
        <div className="rounded-[10px] border p-8 text-center">
          <p className="mb-3 text-muted-foreground">
            {busca ? 'Nenhuma venda encontrada para essa busca.' : 'Você ainda não possui vendas cadastradas.'}
          </p>
          {!busca && <Button asChild><Link href="/app/vendas/nova">Cadastrar primeira venda</Link></Button>}
        </div>
      )}
      <div className="space-y-2">
        {(vendas ?? []).map(v => {
          const comissao = v.comissoes as ComissaoResumo
          return (
            <Link key={v.id} href={`/app/vendas/${v.id}`}
              className="block rounded-[10px] border bg-card p-3 hover:bg-background">
              <div className="flex items-center justify-between">
                <p className="font-medium">{(v.clientes as { nome: string } | null)?.nome}</p>
                <Badge variant={v.status === 'confirmada' ? 'secondary' : 'outline'}>
                  {statusLabel[v.status]}</Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {v.administradora} · G{v.grupo} · C{v.cota}
              </p>
              <div className="mt-2 space-y-1 border-t pt-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Carta</span>
                  <span className="font-medium tabular-nums">{formatBRL(Number(v.valor_carta_centavos))}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Comissão prevista</span>
                  {comissao
                    ? <Valor centavos={Number(comissao.valor_centavos)} />
                    : <span className="font-medium">—</span>}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Receberá</span>
                  <span className="font-medium">{receberaEm(comissao)}</span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
