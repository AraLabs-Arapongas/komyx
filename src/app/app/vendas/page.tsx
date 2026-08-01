'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useVendas } from '@/lib/queries/vendas'
import { formatBRL, formatData } from '@/lib/format'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus } from 'lucide-react'

const statusLabel: Record<string, string> = {
  confirmada: 'Confirmada', cancelada: 'Cancelada', estornada: 'Estornada',
  rascunho: 'Rascunho', arquivada: 'Arquivada',
}

export default function VendasPage() {
  const [busca, setBusca] = useState('')
  const { data: vendas, isLoading } = useVendas(busca)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Vendas</h1>
        <Button asChild><Link href="/app/vendas/nova"><Plus size={16} /> Nova venda</Link></Button>
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
        {(vendas ?? []).map(v => (
          <Link key={v.id} href={`/app/vendas/${v.id}`}
            className="block rounded-[10px] border bg-card p-3 hover:bg-background">
            <div className="flex items-center justify-between">
              <p className="font-medium">{(v.clientes as { nome: string } | null)?.nome}</p>
              <Badge variant={v.status === 'confirmada' ? 'secondary' : 'outline'}>
                {statusLabel[v.status]}</Badge>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {v.administradora} · G{v.grupo} · C{v.cota} · {formatData(v.data_venda)}</span>
              <span className="font-semibold">{formatBRL(Number(v.valor_carta_centavos))}</span>
            </div>
            {v.comissoes && (
              <p className="mt-1 text-sm">Comissão:{' '}
                <span className="font-semibold text-primary">
                  {formatBRL(Number((v.comissoes as { valor_centavos: number }).valor_centavos))}
                </span></p>)}
          </Link>
        ))}
      </div>
    </div>
  )
}
