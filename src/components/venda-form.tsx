'use client'
import { useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronLeft } from 'lucide-react'
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
import { cn } from '@/lib/utils'

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

const TITULOS = ['Quanto foi a venda', 'Qual é a cota', 'De quem é'] as const

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
  const [salvando, setSalvando] = useState(false)
  const [celebracao, setCelebracao] = useState<Celebracao | null>(null)

  /*
   * Editar não é preencher: quem entra aqui vem trocar UM campo, e obrigá-lo a
   * atravessar três passos para chegar nele seria pior que a tela apertada de
   * antes. Os passos existem só no cadastro.
   */
  const emPassos = !vendaId
  const [passo, setPasso] = useState(0)
  const ultimo = TITULOS.length - 1

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

  /** O que falta para sair deste passo — null quando pode seguir. */
  function pendencia(p: number): string | null {
    if (p === 0) {
      if (valorCentavos <= 0) return 'Informe o valor da carta.'
      if (!dataVendaISO) return 'Informe uma data válida.'
    }
    if (p === 1) {
      if (!administradora.trim()) return 'Informe a administradora.'
      if (!grupo.trim()) return 'Informe o grupo.'
      if (!cota.trim()) return 'Informe a cota.'
    }
    return null
  }

  function avancar() {
    const falta = pendencia(passo)
    if (falta) { toast.error(falta); return }
    setPasso(p => Math.min(p + 1, ultimo))
  }

  async function salvar() {
    for (let p = 0; p <= ultimo; p++) {
      const falta = pendencia(p)
      if (falta) { toast.error(falta); if (emPassos) setPasso(p); return }
    }
    setSalvando(true)
    const payload = {
      clienteId, valorCartaCentavos: valorCentavos,
      administradora, grupo, cota, dataVenda: dataVendaISO, observacoes, numeroContrato,
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

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    void salvar()
  }

  /*
   * Enter dentro de um campo nunca grava a venda.
   *
   * Um formulário envia sozinho quando se tecla Enter em qualquer input, e o
   * último passo é o de salvar — bastava o corretor teclar Enter procurando
   * cliente para a venda ir embora sem ele. Isso não é problema de um campo
   * só, é da forma do formulário, então o bloqueio fica aqui: Enter avança
   * enquanto houver passo à frente, e no último não faz nada. Gravar exige o
   * botão.
   */
  function onKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key !== 'Enter') return
    // tecla segurada repete o keydown dezenas de vezes por segundo: sem isto ela
    // sozinha atravessa os passos
    if (e.repeat) { e.preventDefault(); return }
    const alvo = e.target as HTMLElement
    // no botão, Enter é o clique dele; em textarea, é quebra de linha
    if (alvo.tagName === 'BUTTON' || alvo.tagName === 'TEXTAREA') return
    e.preventDefault()
    if (emPassos && passo < ultimo) avancar()
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

  const mostrar = (p: number) => !emPassos || passo === p

  return (
    <form onSubmit={onSubmit} onKeyDown={onKeyDown} className="entra flex flex-1 flex-col">
      {emPassos && (
        <div className="mb-6 space-y-2">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-medium">{TITULOS[passo]}</p>
            <p className="text-xs text-muted-foreground">Passo {passo + 1} de {TITULOS.length}</p>
          </div>
          {/* barra fina em vez de bolinhas: ocupa menos e diz a mesma coisa */}
          <div className="flex gap-1">
            {TITULOS.map((_, i) => (
              <span key={i} className={cn('h-1 flex-1 rounded-full transition-colors',
                i <= passo ? 'bg-primary' : 'bg-border')} />
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 space-y-5">
        {mostrar(0) && (
          <section className="space-y-5">
            <div className="space-y-2">
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
            </div>

            <Campo rotulo="Data da venda" htmlFor="data">
              <CampoData id="data" value={dataTxt} onChange={setDataTxt} required />
            </Campo>
          </section>
        )}

        {mostrar(1) && (
          <section className="space-y-5">
            <Campo rotulo="Administradora" htmlFor="administradora"
              apoio={veioDaMemoria ? 'Preenchida com a da sua última venda.' : undefined}>
              <Input id="administradora" value={administradora} required
                onChange={e => setAdministradoraDigitada(e.target.value)} />
            </Campo>

            <div className="grid grid-cols-2 gap-3">
              <Campo rotulo="Grupo" htmlFor="grupo">
                <CampoInteiro id="grupo" value={grupo} onChange={setGrupo} required />
              </Campo>
              <Campo rotulo="Cota" htmlFor="cota">
                <CampoInteiro id="cota" value={cota} onChange={setCota} required />
              </Campo>
            </div>

            <Campo rotulo="Número do contrato" htmlFor="contrato" opcional>
              <Input id="contrato" value={numeroContrato}
                onChange={e => setNumeroContrato(e.target.value)} />
            </Campo>
          </section>
        )}

        {mostrar(2) && (
          <section className="space-y-5">
            {/* opcional desde a migration 0013: quem fecha na rua registra agora
                e nomeia depois, em vez de inventar cadastro para conseguir salvar */}
            <Campo rotulo="Cliente" htmlFor="cliente" opcional
              apoio={clienteId ? undefined : 'Dá para registrar agora e dizer de quem é depois.'}>
              <ClientePicker value={clienteId} nomeSelecionado={clienteNome}
                onChange={(id, nome) => { setClienteId(id); setClienteNome(nome) }} />
            </Campo>

            <Campo rotulo="Observações" htmlFor="observacoes" opcional>
              <Input id="observacoes" value={observacoes}
                onChange={e => setObservacoes(e.target.value)} />
            </Campo>
          </section>
        )}
      </div>

      {/*
        A ação gruda no pé da tela, logo acima do menu — no alcance do polegar e
        sempre visível, sem depender de o passo ter conteúdo suficiente para
        empurrá-la até lá. O recuo sai da mesma variável que dimensiona o menu,
        senão sobra a folga que existia entre os dois.
      */}
      <div className="sticky bottom-[var(--altura-nav)] z-20 -mx-4 -mb-4 mt-6 flex gap-3
                      bg-background px-4 pb-4 pt-3
                      md:bottom-0 md:-mx-6 md:-mb-6 md:px-6">
        {emPassos && passo > 0 && (
          <Button type="button" variant="outline" size="toque"
            onClick={() => setPasso(p => p - 1)}>
            <ChevronLeft size={18} /> Voltar
          </Button>
        )}
        {/*
          As duas chaves diferentes não são enfeite: sem elas o React reaproveita
          o mesmo nó quando "Continuar" vira "Salvar venda", e o botão chega ao
          último passo já com o foco. Enter repetido então atravessava o wizard e
          gravava a venda sozinho. Com chaves distintas o nó é trocado, o foco
          cai, e gravar volta a exigir um gesto de quem está usando.
        */}
        {emPassos && passo < ultimo ? (
          <Button key="continuar" type="button" size="toque" className="flex-1" onClick={avancar}>
            Continuar
          </Button>
        ) : (
          <Button key="salvar" type="submit" size="toque" className="flex-1" disabled={salvando}>
            {salvando ? 'Salvando…' : vendaId ? 'Salvar alterações' : 'Salvar venda'}
          </Button>
        )}
      </div>
    </form>
  )
}
