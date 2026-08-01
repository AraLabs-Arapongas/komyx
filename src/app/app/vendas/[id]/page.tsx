'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useVenda } from '@/lib/queries/vendas'
import { cancelarVenda } from '@/lib/actions/vendas'
import { formatBRL, formatData, formatPercentual } from '@/lib/format'
import type { Faixa } from '@/lib/domain/types'
import { VendaForm } from '@/components/venda-form'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'

const vendaStatusLabel: Record<string, string> = {
  confirmada: 'Confirmada', cancelada: 'Cancelada', estornada: 'Estornada',
  rascunho: 'Rascunho', arquivada: 'Arquivada',
}

const comissaoStatusLabel: Record<string, string> = {
  prevista: 'Prevista', parcial: 'Parcial', recebida: 'Recebida',
  cancelada: 'Cancelada', estornada: 'Estornada',
}

const recebimentoStatusLabel: Record<string, string> = {
  previsto: 'Previsto', recebido: 'Recebido', cancelado: 'Cancelado', estornado: 'Estornado',
}

export default function VendaDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()
  const { data: venda, isLoading } = useVenda(id)
  const [editando, setEditando] = useState(false)
  const [dialogAberto, setDialogAberto] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [cancelando, setCancelando] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (!venda) {
    return (
      <div className="rounded-[10px] border p-8 text-center">
        <p className="mb-3 text-muted-foreground">Venda não encontrada.</p>
        <Button asChild><Link href="/app/vendas">Voltar para vendas</Link></Button>
      </div>
    )
  }

  const cliente = venda.clientes as { id: string; nome: string; telefone: string | null } | null
  const comissao = venda.comissoes as null | {
    id: string; percentual: number; valor_centavos: number; n_parcelas: number
    status: string; faixa_aplicada: unknown
    recebimentos: {
      id: string; numero_parcela: number; valor_centavos: number
      data_prevista: string; status: string
    }[]
  }
  const faixa = comissao?.faixa_aplicada as Faixa | undefined
  const podeGerenciar = venda.status === 'confirmada'

  async function onConfirmarCancelamento() {
    if (!motivo.trim()) { toast.error('Informe o motivo do cancelamento.'); return }
    setCancelando(true)
    const r = await cancelarVenda(id, motivo)
    setCancelando(false)
    if (!r.ok) { toast.error(r.erro); return }
    qc.invalidateQueries()
    toast.success('Venda cancelada. As parcelas previstas foram canceladas; as já recebidas permanecem no histórico.')
    setDialogAberto(false)
    router.push('/app/vendas')
  }

  if (editando) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Editar venda</h1>
        <VendaForm
          vendaId={venda.id}
          inicial={{
            clienteId: venda.cliente_id,
            clienteNome: cliente?.nome ?? '',
            valorTxt: (venda.valor_carta_centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
            administradora: venda.administradora,
            grupo: venda.grupo,
            cota: venda.cota,
            dataVenda: venda.data_venda,
            observacoes: venda.observacoes ?? '',
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Detalhe da venda</h1>
        <Badge variant={venda.status === 'confirmada' ? 'secondary' : 'outline'}>
          {vendaStatusLabel[venda.status] ?? venda.status}
        </Badge>
      </div>

      {/* Dados da venda */}
      <div className="space-y-2 rounded-[10px] border bg-card p-4">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Cliente</span>
          <span className="font-medium">{cliente?.nome ?? '—'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Valor da carta</span>
          <span className="font-medium">{formatBRL(Number(venda.valor_carta_centavos))}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Administradora</span>
          <span className="font-medium">{venda.administradora}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Grupo / Cota</span>
          <span className="font-medium">G{venda.grupo} · C{venda.cota}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Data da venda</span>
          <span className="font-medium">{formatData(venda.data_venda)}</span>
        </div>
        {venda.observacoes && (
          <div className="flex items-start justify-between gap-4">
            <span className="shrink-0 text-muted-foreground">Observações</span>
            <span className="text-right font-medium">{venda.observacoes}</span>
          </div>
        )}
      </div>

      {/* Comissão */}
      <div className="space-y-2 rounded-[10px] border bg-card p-4">
        <p className="font-medium">Comissão</p>
        {comissao ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Percentual</span>
              <span className="font-medium">{formatPercentual(comissao.percentual)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Valor</span>
              <span className="font-semibold text-primary">{formatBRL(Number(comissao.valor_centavos))}</span>
            </div>
            {faixa && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Faixa</span>
                <span className="font-medium">
                  {formatBRL(faixa.min)} – {faixa.max === null ? 'sem limite' : formatBRL(faixa.max)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Parcelas</span>
              <span className="font-medium">{comissao.n_parcelas} parcelas</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant="outline">{comissaoStatusLabel[comissao.status] ?? comissao.status}</Badge>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma comissão calculada para esta venda.</p>
        )}
      </div>

      {/* Recebimentos */}
      <div className="space-y-2 rounded-[10px] border bg-card p-4">
        <p className="font-medium">Recebimentos</p>
        {comissao && comissao.recebimentos.length > 0 ? (
          <div className="space-y-2">
            {[...comissao.recebimentos]
              .sort((a, b) => a.numero_parcela - b.numero_parcela)
              .map(r => (
                <div key={r.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Parcela {r.numero_parcela} · {formatData(r.data_prevista)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatBRL(Number(r.valor_centavos))}</span>
                    <Badge variant="outline">{recebimentoStatusLabel[r.status] ?? r.status}</Badge>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum recebimento previsto.</p>
        )}
      </div>

      {podeGerenciar && (
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setEditando(true)}>Editar</Button>
          <Button variant="destructive" className="flex-1"
            onClick={() => { setMotivo(''); setDialogAberto(true) }}>Cancelar venda</Button>
        </div>
      )}

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar venda</DialogTitle>
            <DialogDescription>
              As parcelas previstas serão canceladas; as já recebidas permanecem no histórico.
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label>Motivo do cancelamento</Label>
            <Input value={motivo} onChange={e => setMotivo(e.target.value)} required autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAberto(false)}>Voltar</Button>
            <Button variant="destructive" disabled={cancelando || !motivo.trim()}
              onClick={onConfirmarCancelamento}>
              {cancelando ? 'Cancelando…' : 'Confirmar cancelamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
