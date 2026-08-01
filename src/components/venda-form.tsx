'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import { criarVenda, editarVenda } from '@/lib/actions/vendas'
import { parseBRLParaCentavos, dataBRParaISO, formatData } from '@/lib/format'
import { createClient } from '@/lib/supabase/client'
import { PrimeiraComissao } from '@/components/primeira-comissao'
import { ClientePicker } from './cliente-picker'
import { CampoValor, CampoData, CampoInteiro } from '@/components/campos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function hojeSP(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}

type Celebracao = { valorCentavos: number; dataPrevista: string }

/**
 * Só celebra se esta for mesmo a primeira venda da conta. Devolve o valor da
 * comissão e a data da primeira parcela, ou null quando não há o que celebrar.
 */
async function celebrarSePrimeira(vendaId: string): Promise<Celebracao | null> {
  const supabase = createClient()
  const { count } = await supabase.from('vendas').select('id', { count: 'exact', head: true })
  if ((count ?? 0) !== 1) return null

  const { data } = await supabase.from('comissoes')
    .select('valor_centavos, recebimentos(data_prevista, status)')
    .eq('venda_id', vendaId).maybeSingle()
  if (!data) return null

  const previstos = (data.recebimentos ?? []).filter(r => r.status === 'previsto')
  if (previstos.length === 0) return null
  const primeira = previstos.reduce((m, r) => (r.data_prevista < m ? r.data_prevista : m),
    previstos[0].data_prevista)
  return { valorCentavos: Number(data.valor_centavos), dataPrevista: primeira }
}

export function VendaForm({ vendaId, inicial }: {
  vendaId?: string
  inicial?: {
    clienteId: string; clienteNome: string; valorTxt: string; administradora: string
    grupo: string; cota: string; dataVenda?: string; observacoes: string
    numeroContrato?: string; tags?: string[]
  }
}) {
  const router = useRouter()
  const qc = useQueryClient()
  const [clienteId, setClienteId] = useState<string | null>(inicial?.clienteId ?? null)
  const [clienteNome, setClienteNome] = useState(inicial?.clienteNome ?? '')
  const [valorTxt, setValorTxt] = useState(inicial?.valorTxt ?? '')
  const [administradora, setAdministradora] = useState(inicial?.administradora ?? '')
  const [grupo, setGrupo] = useState(inicial?.grupo ?? '')
  const [cota, setCota] = useState(inicial?.cota ?? '')
  const [dataTxt, setDataTxt] = useState(formatData(inicial?.dataVenda ?? hojeSP()))
  const [numeroContrato, setNumeroContrato] = useState(inicial?.numeroContrato ?? '')
  const [tags, setTags] = useState<string[]>(inicial?.tags ?? [])
  const [tagTxt, setTagTxt] = useState('')
  const [observacoes, setObservacoes] = useState(inicial?.observacoes ?? '')
  const [mostrarObs, setMostrarObs] = useState(!!inicial?.observacoes)
  const [salvando, setSalvando] = useState(false)
  const [celebracao, setCelebracao] = useState<Celebracao | null>(null)

  function onTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const t = tagTxt.trim()
      if (t && !tags.includes(t)) setTags(prev => [...prev, t])
      setTagTxt('')
    } else if (e.key === 'Backspace' && !tagTxt && tags.length > 0) {
      setTags(prev => prev.slice(0, -1))
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clienteId) { toast.error('Selecione um cliente.'); return }
    const dataVenda = dataBRParaISO(dataTxt)
    if (!dataVenda) { toast.error('Informe uma data válida.'); return }
    setSalvando(true)
    const payload = {
      clienteId, valorCartaCentavos: parseBRLParaCentavos(valorTxt),
      administradora, grupo, cota, dataVenda, observacoes,
      numeroContrato, tags,
    }
    const r = vendaId ? await editarVenda(vendaId, payload) : await criarVenda(payload)
    setSalvando(false)
    if (!r.ok) { toast.error(r.erro); return }
    qc.invalidateQueries()

    // a primeira venda é o momento em que o produto prova o que promete:
    // em vez de um toast que some, o corretor vê a comissão que acabou de ganhar
    if (!vendaId && 'vendaId' in r && typeof r.vendaId === 'string') {
      const primeira = await celebrarSePrimeira(r.vendaId)
      if (primeira) { setCelebracao(primeira); return }
    }

    toast.success(vendaId ? 'Venda atualizada. Comissões recalculadas.'
                          : 'Venda registrada. Comissão calculada automaticamente.')
    router.push('/app/vendas')
  }

  if (celebracao) {
    return (
      <PrimeiraComissao
        valorCentavos={celebracao.valorCentavos}
        dataPrevista={celebracao.dataPrevista}
        aoFechar={() => router.push('/app')}
      />
    )
  }

  return (
    <form onSubmit={onSubmit} className="entra space-y-3">
      <div>
        <p className="mb-1 text-xs text-muted-foreground">Cliente</p>
        <ClientePicker value={clienteId} nomeSelecionado={clienteNome}
          onChange={(id, nome) => { setClienteId(id); setClienteNome(nome) }} />
      </div>

      <CampoValor value={valorTxt} onChange={setValorTxt} placeholder="Valor da carta" required />

      <div className="grid grid-cols-2 gap-3">
        <CampoInteiro value={grupo} onChange={setGrupo} placeholder="Grupo" required />
        <CampoInteiro value={cota} onChange={setCota} placeholder="Cota" required />
      </div>

      <Input value={administradora} onChange={e => setAdministradora(e.target.value)}
        placeholder="Administradora" required />

      <div>
        <p className="mb-1 text-xs text-muted-foreground">Data da venda</p>
        <CampoData value={dataTxt} onChange={setDataTxt} required />
      </div>

      <Input value={numeroContrato} onChange={e => setNumeroContrato(e.target.value)}
        placeholder="Número do contrato (opcional)" />

      <div>
        {tags.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            {tags.map(t => (
              <span key={t}
                className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground">
                {t}
                <button type="button" onClick={() => setTags(prev => prev.filter(x => x !== t))}
                  className="text-muted-foreground hover:text-foreground" aria-label={`Remover tag ${t}`}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
        <Input value={tagTxt} onChange={e => setTagTxt(e.target.value)} onKeyDown={onTagKeyDown}
          placeholder="Tags (opcional) — Enter para adicionar" />
      </div>

      {mostrarObs ? (
        <Input value={observacoes} onChange={e => setObservacoes(e.target.value)}
          placeholder="Observações" autoFocus />
      ) : (
        <button type="button"
          className="text-sm text-muted-foreground underline underline-offset-2"
          onClick={() => setMostrarObs(true)}>
          + Observações
        </button>
      )}

      <Button type="submit" className="w-full" disabled={salvando}>
        {salvando ? 'Salvando…' : 'Salvar venda'}
      </Button>
    </form>
  )
}
