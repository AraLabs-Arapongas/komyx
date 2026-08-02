'use client'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { VendaForm } from '@/components/venda-form'
import { useVenda } from '@/lib/queries/vendas'
import { Skeleton } from '@/components/ui/skeleton'
import { Voltar } from '@/components/voltar'

function NovaVendaConteudo() {
  const params = useSearchParams()
  const duplicarId = params.get('duplicar')
  const { data: origem, isLoading } = useVenda(duplicarId ?? '', { enabled: !!duplicarId })

  if (duplicarId && isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    )
  }

  const inicial = origem ? {
    // cota nunca se repete, então fica em branco; data vira "hoje" (o
    // VendaForm já assume hoje quando dataVenda não é informada)
    clienteId: origem.cliente_id,
    clienteNome: (origem.clientes as { nome: string } | null)?.nome ?? '',
    valorTxt: (origem.valor_carta_centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
    administradora: origem.administradora,
    grupo: origem.grupo,
    cota: '',
    observacoes: origem.observacoes ?? '',
    numeroContrato: origem.numero_contrato ?? '',
  } : undefined

  return <VendaForm inicial={inicial} />
}

export default function NovaVendaPage() {
  return (
    <div className="coluna-formulario space-y-4 md:min-h-0">
      <Voltar href="/app/vendas" />
      <h1 className="text-xl font-semibold">Nova venda</h1>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <NovaVendaConteudo />
      </Suspense>
    </div>
  )
}
