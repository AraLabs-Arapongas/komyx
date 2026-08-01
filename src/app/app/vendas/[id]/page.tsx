'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Copy } from 'lucide-react'
import { useVenda, useEventosVenda, type EventoVenda } from '@/lib/queries/vendas'
import { queryKeys } from '@/lib/queries/keys'
import { createClient } from '@/lib/supabase/client'
import { cancelarVenda, estornarVenda } from '@/lib/actions/vendas'
import { formatBRL, formatData, formatPercentual, formatMesAno } from '@/lib/format'
import { ROTULOS_ESTORNO, type Faixa, type PoliticaEstorno } from '@/lib/domain/types'
import { VendaForm } from '@/components/venda-form'
import { Valor } from '@/components/valor'
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

/** Traduz um evento de auditoria da venda para uma frase em pt-BR. */
function descreverEvento(ev: EventoVenda): string {
  if (ev.acao === 'criou') return 'Venda registrada'
  if (ev.acao === 'removeu') return 'Venda removida'

  const antes = ev.antes, depois = ev.depois
  if (!antes || !depois) return 'Venda atualizada'

  if (antes.status !== depois.status) {
    if (depois.status === 'cancelada') return 'Venda cancelada'
    if (depois.status === 'estornada') return 'Desistência registrada'
    return `Status alterado de ${vendaStatusLabel[String(antes.status)] ?? antes.status} para ${vendaStatusLabel[String(depois.status)] ?? depois.status}`
  }
  if (antes.valor_carta_centavos !== depois.valor_carta_centavos) {
    return `Valor alterado de ${formatBRL(Number(antes.valor_carta_centavos))} para ${formatBRL(Number(depois.valor_carta_centavos))}`
  }
  if (antes.data_venda !== depois.data_venda) {
    return `Data da venda alterada de ${formatData(String(antes.data_venda))} para ${formatData(String(depois.data_venda))}`
  }
  return 'Venda atualizada'
}

function formatDataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo',
  })
}

export default function VendaDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()
  const { data: venda, isLoading } = useVenda(id)
  const { data: eventos } = useEventosVenda(id)
  const [editando, setEditando] = useState(false)
  const [dialogAberto, setDialogAberto] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [cancelando, setCancelando] = useState(false)
  const [dialogEstorno, setDialogEstorno] = useState(false)
  const [motivoEstorno, setMotivoEstorno] = useState('')
  const [cobrarRecebido, setCobrarRecebido] = useState(false)
  const [estornando, setEstornando] = useState(false)
  const { data: config } = useQuery({
    queryKey: queryKeys.config,
    queryFn: async () => {
      const { data, error } = await createClient().from('config_financeira')
        .select('politica_estorno').eq('ativa', true).single()
      if (error) throw error
      return data
    },
  })

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
  const competencia = venda.competencias as { ano: number; mes: number } | null
  const faixa = comissao?.faixa_aplicada as Faixa | undefined
  const podeGerenciar = venda.status === 'confirmada'
  const politica = (config?.politica_estorno ?? 'perguntar') as PoliticaEstorno
  const totalRecebidoCentavos = (comissao?.recebimentos ?? [])
    .filter(r => r.status === 'recebido')
    .reduce((s, r) => s + Number(r.valor_centavos), 0)

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

  async function onConfirmarEstorno() {
    if (!motivoEstorno.trim()) { toast.error('Informe o motivo da desistência.'); return }
    setEstornando(true)
    const r = await estornarVenda(id, motivoEstorno, cobrarRecebido)
    setEstornando(false)
    if (!r.ok) { toast.error(r.erro); return }
    qc.invalidateQueries()
    toast.success(cobrarRecebido
      ? 'Desistência registrada. As parcelas futuras foram canceladas e as já pagas entraram como estorno.'
      : 'Desistência registrada. As parcelas futuras foram canceladas.')
    setDialogEstorno(false)
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
            numeroContrato: venda.numero_contrato ?? '',
            tags: venda.tags ?? [],
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

      <Button variant="outline" size="sm"
        onClick={() => router.push(`/app/vendas/nova?duplicar=${venda.id}`)}>
        <Copy size={16} /> Duplicar
      </Button>

      {/* Dados da venda */}
      <div className="entra space-y-0.5">
        <div className="flex items-center justify-between border-b border-border/60 py-2">
          <span className="text-muted-foreground">Cliente</span>
          <span className="font-medium">{cliente?.nome ?? '—'}</span>
        </div>
        <div className="flex items-center justify-between border-b border-border/60 py-2">
          <span className="text-muted-foreground">Valor da carta</span>
          <Valor centavos={Number(venda.valor_carta_centavos)} destaque={false} className="font-medium" />
        </div>
        <div className="flex items-center justify-between border-b border-border/60 py-2">
          <span className="text-muted-foreground">Administradora</span>
          <span className="font-medium">{venda.administradora}</span>
        </div>
        <div className="flex items-center justify-between border-b border-border/60 py-2">
          <span className="text-muted-foreground">Grupo / Cota</span>
          <span className="font-medium">G{venda.grupo} · C{venda.cota}</span>
        </div>
        {venda.numero_contrato && (
          <div className="flex items-center justify-between border-b border-border/60 py-2">
            <span className="text-muted-foreground">Número do contrato</span>
            <span className="font-medium">{venda.numero_contrato}</span>
          </div>
        )}
        <div className="flex items-center justify-between border-b border-border/60 py-2">
          <span className="text-muted-foreground">Data da venda</span>
          <span className="font-medium">{formatData(venda.data_venda)}</span>
        </div>
        {venda.tags && venda.tags.length > 0 && (
          <div className="flex items-start justify-between gap-4 border-b border-border/60 py-2">
            <span className="shrink-0 text-muted-foreground">Tags</span>
            <div className="flex flex-wrap justify-end gap-1.5">
              {venda.tags.map(t => (
                <span key={t} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
        {venda.observacoes && (
          <div className="flex items-start justify-between gap-4 py-2">
            <span className="shrink-0 text-muted-foreground">Observações</span>
            <span className="text-right font-medium">{venda.observacoes}</span>
          </div>
        )}
      </div>

      {/* Comissão */}
      <div className="entra-suave space-y-3">
        <p className="font-medium">Comissão</p>
        {comissao ? (
          <>
            <div className="rounded-2xl bg-money-soft p-5">
              <p className="text-3xl"><Valor centavos={Number(comissao.valor_centavos)} /></p>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatPercentual(comissao.percentual)} sobre o valor da carta
              </p>
            </div>
            <div className="space-y-0.5 text-sm">
              {competencia && (
                <div className="flex items-center justify-between border-b border-border/60 py-2">
                  <span className="text-muted-foreground">Competência</span>
                  <span className="font-medium">{formatMesAno(competencia.ano, competencia.mes)}</span>
                </div>
              )}
              {faixa && (
                <div className="flex items-center justify-between border-b border-border/60 py-2">
                  <span className="text-muted-foreground">Faixa aplicada</span>
                  <span className="font-medium">
                    {formatBRL(faixa.min)} – {faixa.max === null ? 'sem limite' : formatBRL(faixa.max)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between border-b border-border/60 py-2">
                <span className="text-muted-foreground">Parcelas</span>
                <span className="font-medium">{comissao.n_parcelas} parcelas</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">Situação</span>
                <Badge variant="outline">{comissaoStatusLabel[comissao.status] ?? comissao.status}</Badge>
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma comissão calculada para esta venda.</p>
        )}
      </div>

      {/* Recebimentos */}
      <div className="entra-suave space-y-2">
        <p className="font-medium">Recebimentos</p>
        {comissao && comissao.recebimentos.length > 0 ? (
          <div className="space-y-0.5">
            {[...comissao.recebimentos]
              .sort((a, b) => a.numero_parcela - b.numero_parcela)
              .map(r => (
                <div key={r.id} className="flex items-center justify-between border-b border-border/60 py-2 text-sm">
                  <span className="text-muted-foreground">
                    Parcela {r.numero_parcela} · {formatData(r.data_prevista)}
                  </span>
                  <div className="flex items-center gap-2">
                    <Valor centavos={Number(r.valor_centavos)} />
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
        <div className="space-y-2">
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setEditando(true)}>Editar</Button>
            <Button variant="outline" className="flex-1" onClick={() => {
              setMotivoEstorno('')
              // a política do escritório entra como sugestão; a palavra final
              // é de quem está registrando
              setCobrarRecebido(politica === 'tudo')
              setDialogEstorno(true)
            }}>Cliente desistiu</Button>
          </div>
          <Button variant="destructive" className="w-full"
            onClick={() => { setMotivo(''); setDialogAberto(true) }}>Cancelar venda</Button>
          <p className="text-xs text-muted-foreground">
            Cancele quando a venda foi registrada por engano. Se o cliente fechou e depois
            desistiu, registre a desistência para o estorno ficar no histórico.
          </p>
        </div>
      )}

      {/* Histórico */}
      {eventos && eventos.length > 0 && (
        <div className="entra-suave space-y-3">
          <p className="font-medium">Histórico</p>
          <div className="space-y-3 border-l-2 border-border pl-4">
            {eventos.map(ev => (
              <div key={ev.id}>
                <p className="text-sm font-medium">{descreverEvento(ev)}</p>
                <p className="text-xs text-muted-foreground">{formatDataHora(ev.criado_em)}</p>
              </div>
            ))}
          </div>
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

      <Dialog open={dialogEstorno} onOpenChange={setDialogEstorno}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cliente desistiu</DialogTitle>
            <DialogDescription>
              As parcelas ainda não pagas serão canceladas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1">
            <Label>Motivo da desistência</Label>
            <Input value={motivoEstorno} onChange={e => setMotivoEstorno(e.target.value)} required autoFocus />
          </div>

          {totalRecebidoCentavos > 0 ? (
            <label className="flex cursor-pointer gap-3 rounded-[10px] border p-3">
              <input
                type="checkbox"
                className="mt-0.5 size-4 shrink-0 cursor-pointer accent-foreground"
                checked={cobrarRecebido}
                onChange={e => setCobrarRecebido(e.target.checked)}
              />
              <span className="space-y-0.5">
                <span className="block text-sm font-medium">
                  O escritório vai descontar o que já recebi
                </span>
                <span className="block text-sm text-muted-foreground">
                  Você já recebeu <Valor centavos={totalRecebidoCentavos} destaque={false} className="font-normal" />{' '}
                  desta venda. Marcando, esse valor entra como estorno e deixa de contar como recebido.
                </span>
                <span className="block text-xs text-muted-foreground">
                  Sua regra: {ROTULOS_ESTORNO[politica].titulo.toLowerCase()}.
                </span>
              </span>
            </label>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma parcela desta venda foi recebida ainda, então não há o que estornar.
            </p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogEstorno(false)}>Voltar</Button>
            <Button disabled={estornando || !motivoEstorno.trim()} onClick={onConfirmarEstorno}>
              {estornando ? 'Registrando…' : 'Registrar desistência'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
