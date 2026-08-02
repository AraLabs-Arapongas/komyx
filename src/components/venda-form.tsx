'use client'
import { useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronDown } from 'lucide-react'
import { criarVenda, editarVenda } from '@/lib/actions/vendas'
import { parseBRLParaCentavos, dataBRParaISO, formatData, formatDataExtenso, formatPercentual } from '@/lib/format'
import { createClient } from '@/lib/supabase/client'
import { useSimulacaoVenda } from '@/lib/queries/simulacao'
import { PrimeiraComissao } from '@/components/primeira-comissao'
import { ClientePicker } from './cliente-picker'
import { CampoValor, CampoData, CampoInteiro } from '@/components/campos'
import { Valor } from '@/components/valor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function hojeSP(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}

/*
 * A administradora quase nunca muda: o corretor trabalha com uma, no máximo
 * duas. Digitar o mesmo nome a cada venda é trabalho que o aparelho pode fazer.
 *
 * useSyncExternalStore, e não um efeito: o componente também renderiza no
 * servidor, onde localStorage não existe. O snapshot do servidor é vazio, e a
 * hidratação troca pelo valor guardado sem acusar divergência.
 */
const CHAVE_ADMINISTRADORA = 'komyx:ultima-administradora'
const ouvintes = new Set<() => void>()

function assinar(aoMudar: () => void) {
  ouvintes.add(aoMudar)
  window.addEventListener('storage', aoMudar)
  return () => { ouvintes.delete(aoMudar); window.removeEventListener('storage', aoMudar) }
}
function lerDoAparelho(): string {
  return window.localStorage.getItem(CHAVE_ADMINISTRADORA) ?? ''
}
function lerNoServidor(): string {
  return ''
}
function lembrarAdministradora(nome: string) {
  const limpo = nome.trim()
  if (!limpo) return
  window.localStorage.setItem(CHAVE_ADMINISTRADORA, limpo)
  ouvintes.forEach(o => o())
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

/** Rótulo acima do campo, com a marca de opcional quando for o caso. */
function Campo({ rotulo, htmlFor, opcional, apoio, children }: {
  rotulo: string; htmlFor: string; opcional?: boolean; apoio?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={htmlFor}>{rotulo}</Label>
        {opcional && <span className="text-xs text-muted-foreground">opcional</span>}
      </div>
      {children}
      {apoio && <p className="text-xs text-muted-foreground">{apoio}</p>}
    </div>
  )
}

export function VendaForm({ vendaId, inicial }: {
  vendaId?: string
  inicial?: {
    clienteId: string | null; clienteNome: string; valorTxt: string; administradora: string
    grupo: string; cota: string; dataVenda?: string; observacoes: string
    numeroContrato?: string
  }
}) {
  const router = useRouter()
  const qc = useQueryClient()
  const [clienteId, setClienteId] = useState<string | null>(inicial?.clienteId ?? null)
  const [clienteNome, setClienteNome] = useState(inicial?.clienteNome ?? '')
  const [valorTxt, setValorTxt] = useState(inicial?.valorTxt ?? '')
  const [grupo, setGrupo] = useState(inicial?.grupo ?? '')
  const [cota, setCota] = useState(inicial?.cota ?? '')
  const [dataTxt, setDataTxt] = useState(formatData(inicial?.dataVenda ?? hojeSP()))
  const [numeroContrato, setNumeroContrato] = useState(inicial?.numeroContrato ?? '')
  const [observacoes, setObservacoes] = useState(inicial?.observacoes ?? '')
  const [mostrarDetalhes, setMostrarDetalhes] = useState(
    !!inicial?.observacoes || !!inicial?.numeroContrato)
  const [salvando, setSalvando] = useState(false)
  const [celebracao, setCelebracao] = useState<Celebracao | null>(null)

  // null = o corretor ainda não tocou no campo, então vale a lembrada
  const lembrada = useSyncExternalStore(assinar, lerDoAparelho, lerNoServidor)
  const [administradoraDigitada, setAdministradoraDigitada] =
    useState<string | null>(inicial?.administradora ?? null)
  const administradora = administradoraDigitada ?? lembrada
  const veioDaMemoria = administradoraDigitada === null && lembrada !== ''

  const valorCentavos = parseBRLParaCentavos(valorTxt)
  const dataVendaISO = dataBRParaISO(dataTxt)
  const { simulacao } = useSimulacaoVenda({
    valorCentavos, dataVenda: dataVendaISO || null, ignorarVendaId: vendaId,
  })

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const dataVenda = dataBRParaISO(dataTxt)
    if (!dataVenda) { toast.error('Informe uma data válida.'); return }
    setSalvando(true)
    const payload = {
      clienteId, valorCartaCentavos: valorCentavos,
      administradora, grupo, cota, dataVenda, observacoes, numeroContrato,
    }
    const r = vendaId ? await editarVenda(vendaId, payload) : await criarVenda(payload)
    setSalvando(false)
    if (!r.ok) { toast.error(r.erro); return }
    lembrarAdministradora(administradora)
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
    <form onSubmit={onSubmit} className="entra space-y-7">
      {/*
        O valor da carta manda na tela porque é dele que sai tudo: é o único
        campo, junto da data, que o motor precisa para calcular. Vinha do mesmo
        tamanho de "Tags", competindo com sete irmãos por atenção.
      */}
      <section className="space-y-2">
        <Label htmlFor="valor" className="text-sm text-muted-foreground">Valor da carta</Label>
        <CampoValor id="valor" value={valorTxt} onChange={setValorTxt} required autoFocus
          className="h-16 !text-3xl font-semibold tracking-tight" />

        {/* a promessa do produto, respondida antes de salvar */}
        <div className="min-h-[4.5rem] rounded-xl bg-money-soft/60 px-4 py-3">
          {simulacao ? (
            <div className="entra-suave space-y-0.5">
              <p className="text-xs text-money">Sua comissão</p>
              <Valor centavos={simulacao.comissaoCentavos} destaque className="block text-2xl" />
              <p className="text-xs text-muted-foreground">
                {formatPercentual(simulacao.percentual)} · {simulacao.nParcelas}
                {simulacao.nParcelas === 1 ? ' parcela de ' : ' parcelas de '}
                <Valor centavos={simulacao.parcelaCentavos} />
                {simulacao.primeiraParcela && ` · a partir de ${formatDataExtenso(simulacao.primeiraParcela)}`}
              </p>
              {/* a faixa é retroativa: esta venda pode mexer nas outras do mês */}
              {simulacao.mudouFaixa && (
                <p className="pt-1 text-xs font-medium text-money">
                  Esta venda muda a faixa do mês: suas outras vendas ganham{' '}
                  <Valor centavos={Math.abs(simulacao.efeitoNasOutrasCentavos)} /> a mais.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Digite o valor e eu mostro sua comissão antes de salvar.
            </p>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <Campo rotulo="Data da venda" htmlFor="data">
          <CampoData id="data" value={dataTxt} onChange={setDataTxt} required className="h-12" />
        </Campo>

        <Campo rotulo="Administradora" htmlFor="administradora"
          apoio={veioDaMemoria ? 'Preenchida com a da sua última venda.' : undefined}>
          <Input id="administradora" value={administradora} required className="h-12"
            onChange={e => setAdministradoraDigitada(e.target.value)} />
        </Campo>

        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Grupo" htmlFor="grupo">
            <CampoInteiro id="grupo" value={grupo} onChange={setGrupo} required className="h-12" />
          </Campo>
          <Campo rotulo="Cota" htmlFor="cota">
            <CampoInteiro id="cota" value={cota} onChange={setCota} required className="h-12" />
          </Campo>
        </div>

        {/* opcional desde a migration 0013: quem fecha na rua registra agora e
            nomeia depois, em vez de inventar cadastro para conseguir salvar */}
        <Campo rotulo="Cliente" htmlFor="cliente" opcional
          apoio={clienteId ? undefined : 'Dá para registrar agora e dizer de quem é depois.'}>
          <ClientePicker value={clienteId} nomeSelecionado={clienteNome}
            onChange={(id, nome) => { setClienteId(id); setClienteNome(nome) }} />
        </Campo>
      </section>

      <section className="space-y-4">
        <button type="button" onClick={() => setMostrarDetalhes(v => !v)}
          className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          Mais detalhes
          <ChevronDown size={16} className={mostrarDetalhes ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </button>

        {mostrarDetalhes && (
          <div className="entra-suave space-y-4">
            <Campo rotulo="Número do contrato" htmlFor="contrato" opcional>
              <Input id="contrato" value={numeroContrato} className="h-12"
                onChange={e => setNumeroContrato(e.target.value)} />
            </Campo>
            <Campo rotulo="Observações" htmlFor="observacoes" opcional>
              <Input id="observacoes" value={observacoes} className="h-12"
                onChange={e => setObservacoes(e.target.value)} />
            </Campo>
          </div>
        )}
      </section>

      <Button type="submit" size="lg" className="h-12 w-full" disabled={salvando}>
        {salvando ? 'Salvando…' : vendaId ? 'Salvar alterações' : 'Salvar venda'}
      </Button>
    </form>
  )
}
