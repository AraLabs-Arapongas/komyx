'use client'
import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useCliente, useVendasDoCliente } from '@/lib/queries/clientes'
import { ClienteForm } from '@/components/cliente-form'
import { Valor } from '@/components/valor'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Pencil } from 'lucide-react'

const vendaStatusLabel: Record<string, string> = {
  confirmada: 'Confirmada', cancelada: 'Cancelada', estornada: 'Estornada',
  rascunho: 'Rascunho', arquivada: 'Arquivada',
}
const comissaoStatusLabel: Record<string, string> = {
  prevista: 'Prevista', parcial: 'Parcial', recebida: 'Recebida',
  cancelada: 'Cancelada', estornada: 'Estornada',
}

export default function ClienteDetalhePage() {
  const { id } = useParams<{ id: string }>()

  // sem rota /clientes/nova dedicada: o "novo" chega aqui e o [id] vira o
  // ponto único de criação e edição do cadastro
  if (id === 'novo') {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Novo cliente</h1>
        <ClienteForm />
      </div>
    )
  }

  return <ClienteExistente id={id} />
}

function ClienteExistente({ id }: { id: string }) {
  const { data: cliente, isLoading } = useCliente(id)
  const { data: vendas, isLoading: carregandoVendas } = useVendasDoCliente(id)
  const [editando, setEditando] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (!cliente) {
    return (
      <div className="rounded-[10px] border p-8 text-center">
        <p className="mb-3 text-muted-foreground">Cliente não encontrado.</p>
        <Button asChild><Link href="/app/clientes">Voltar para clientes</Link></Button>
      </div>
    )
  }

  if (editando) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Editar cliente</h1>
        <ClienteForm
          clienteId={cliente.id}
          inicial={{
            nome: cliente.nome,
            telefone: cliente.telefone ?? '',
            email: cliente.email ?? '',
            documento: cliente.documento ?? '',
            cidade: cliente.cidade ?? '',
            observacoes: cliente.observacoes ?? '',
          }}
          aoSalvar={() => setEditando(false)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{cliente.nome}</h1>
        <Button variant="outline" onClick={() => setEditando(true)}><Pencil size={18} /> Editar</Button>
      </div>

      <div className="space-y-2 rounded-[10px] border bg-card p-4">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Telefone</span>
          <span className="font-medium">{cliente.telefone || '—'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">E-mail</span>
          <span className="font-medium">{cliente.email || '—'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Documento</span>
          <span className="font-medium">{cliente.documento || '—'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Cidade</span>
          <span className="font-medium">{cliente.cidade || '—'}</span>
        </div>
        {cliente.observacoes && (
          <div className="flex items-start justify-between gap-4">
            <span className="shrink-0 text-muted-foreground">Observações</span>
            <span className="text-right font-medium">{cliente.observacoes}</span>
          </div>
        )}
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Vendas</h2>
        {carregandoVendas && <Skeleton className="h-20 w-full" />}
        {!carregandoVendas && (vendas ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma venda registrada para este cliente ainda.</p>
        )}
        {(vendas ?? []).map(v => (
          <Link key={v.id} href={`/app/vendas/${v.id}`}
            className="block rounded-[10px] border bg-card p-3 hover:bg-background">
            <div className="flex items-center justify-between">
              <p className="font-medium">{cliente.nome}</p>
              <Badge variant={v.status === 'confirmada' ? 'secondary' : 'outline'}>
                {vendaStatusLabel[v.status] ?? v.status}
              </Badge>
            </div>
            <div className="mt-2 space-y-1 border-t pt-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Carta</span>
                <Valor centavos={Number(v.valor_carta_centavos)} destaque={false} className="font-medium" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Comissão prevista</span>
                {v.comissoes
                  ? <Valor centavos={Number(v.comissoes.valor_centavos)} />
                  : <span className="font-medium">—</span>}
              </div>
              {v.comissoes && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status da comissão</span>
                  <Badge variant="outline">{comissaoStatusLabel[v.comissoes.status] ?? v.comissoes.status}</Badge>
                </div>
              )}
            </div>
          </Link>
        ))}
      </section>
    </div>
  )
}
