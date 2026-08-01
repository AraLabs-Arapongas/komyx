'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useClientesLista } from '@/lib/queries/clientes'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, ChevronRight } from 'lucide-react'

function pluralizar(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural
}

export default function ClientesPage() {
  const [busca, setBusca] = useState('')
  const { data: clientes, isLoading } = useClientesLista(busca)
  const total = clientes?.length ?? 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Clientes</h1>
        <Button asChild><Link href="/app/clientes/novo"><Plus size={18} /> Novo cliente</Link></Button>
      </div>

      <Input placeholder="Buscar por nome…" value={busca} onChange={e => setBusca(e.target.value)} />

      {!isLoading && clientes && (
        <p className="text-sm text-muted-foreground">
          {total} {pluralizar(total, 'cliente', 'clientes')}
        </p>
      )}

      {isLoading && <Skeleton className="h-24 w-full" />}

      {!isLoading && (clientes ?? []).length === 0 && (
        <div className="rounded-[10px] border p-8 text-center">
          <p className="mb-3 text-muted-foreground">
            {busca ? 'Nenhum cliente encontrado para essa busca.' : 'Você ainda não cadastrou nenhum cliente.'}
          </p>
          {!busca && <Button asChild><Link href="/app/clientes/novo">Cadastrar primeiro cliente</Link></Button>}
        </div>
      )}

      <div className="space-y-2">
        {(clientes ?? []).map(c => {
          const nVendas = c.vendas?.[0]?.count ?? 0
          return (
            <Link key={c.id} href={`/app/clientes/${c.id}`}
              className="flex items-center justify-between gap-3 rounded-[10px] border bg-card p-3 hover:bg-background">
              <div className="min-w-0">
                <p className="font-medium">{c.nome}</p>
                <p className="text-sm text-muted-foreground">
                  {c.telefone || 'Sem telefone'} · {nVendas} {pluralizar(nVendas, 'venda', 'vendas')}
                </p>
              </div>
              <ChevronRight className="shrink-0 text-muted-foreground" size={18} />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
