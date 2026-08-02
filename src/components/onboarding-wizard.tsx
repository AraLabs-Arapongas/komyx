'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { CampoValor, CampoPercentual, CampoInteiro } from '@/components/campos'
import { CurvaMarca } from '@/components/curva-marca'
import { salvarConfig } from '@/lib/actions/config'
import { parseBRLParaCentavos, formatBRL } from '@/lib/format'
import { ROTULOS_ESTORNO, type PoliticaEstorno } from '@/lib/domain/types'
import { cn } from '@/lib/utils'
import { ArrowLeft, ArrowRight, Plus, Trash2, TrendingUp, CalendarDays, Undo2 } from 'lucide-react'

type FaixaDraft = { maxTxt: string; percentualTxt: string; parcelasTxt: string; semLimite: boolean }
type Passo = 'boas-vindas' | 'faixas' | 'calendario' | 'estorno' | 'conclusao'

const TOTAL_PASSOS = 4
const NUMERO_DO_PASSO: Record<Passo, number> = {
  'boas-vindas': 0, faixas: 1, calendario: 2, estorno: 3, conclusao: 4,
}

/** Trilha de progresso simples: "Passo X de 4". Não aparece nas telas de bordas (boas-vindas). */
function Progresso({ passo }: { passo: Passo }) {
  const atual = NUMERO_DO_PASSO[passo]
  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        {Array.from({ length: TOTAL_PASSOS }).map((_, i) => (
          <div key={i} className={cn('h-1 flex-1 rounded-full transition-colors', i < atual ? 'bg-money' : 'bg-border')} />
        ))}
      </div>
      <p className="text-xs font-medium text-muted-foreground">Passo {atual} de {TOTAL_PASSOS}</p>
    </div>
  )
}

function Navegacao({ aoVoltar, aoContinuar, rotulo = 'Continuar', carregando = false, erro }: {
  aoVoltar: () => void; aoContinuar: () => void; rotulo?: string; carregando?: boolean
  erro?: string | null
}) {
  return (
    <div className="space-y-2 pt-2">
      {/* o erro mora junto do botão e fica até ser resolvido: o toast some em
          poucos segundos, no topo da tela, longe de onde o dedo acabou de
          tocar — o corretor conclui que o botão não funciona */}
      {erro && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {erro}
        </p>
      )}
      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" className="h-11 gap-1.5 px-3" onClick={aoVoltar}>
          <ArrowLeft size={18} /> Voltar
        </Button>
        <Button type="button" className="h-11 gap-1.5 px-6" onClick={aoContinuar} disabled={carregando}>
          {carregando ? 'Aguarde…' : rotulo} <ArrowRight size={18} />
        </Button>
      </div>
    </div>
  )
}

function SecaoTitulo({ icone: Icone, rotulo, titulo }: { icone: typeof TrendingUp; rotulo: string; titulo: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-money">
        <Icone size={20} />
        <span className="text-sm font-medium">{rotulo}</span>
      </div>
      <h2 className="text-2xl font-semibold sm:text-3xl">{titulo}</h2>
    </div>
  )
}

export function OnboardingWizard({ passoInicial = 'boas-vindas', preview = false }: {
  passoInicial?: Passo
  /** No menu de desenvolvimento: percorre as telas sem gravar configuração. */
  preview?: boolean
} = {}) {
  const [passo, setPasso] = useState<Passo>(passoInicial)
  const [faixas, setFaixas] = useState<FaixaDraft[]>([{ maxTxt: '', percentualTxt: '', parcelasTxt: '', semLimite: true }])
  const [fechamento, setFechamento] = useState('25')
  const [pagamento, setPagamento] = useState('10')
  const [estorno, setEstorno] = useState<PoliticaEstorno>('perguntar')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function irPara(p: Passo) { setErro(null); setPasso(p) }

  function minDaFaixa(i: number): number {
    if (i === 0) return 0
    const antMax = parseBRLParaCentavos(faixas[i - 1].maxTxt)
    return antMax + 1
  }

  function validarFaixas(): string | null {
    for (let i = 0; i < faixas.length; i++) {
      const f = faixas[i]
      if (!f.semLimite && f.maxTxt.trim() === '')
        return `Informe até quanto vale a faixa ${i + 1}, ou marque "sem limite".`
      if (!f.percentualTxt || parseFloat(f.percentualTxt.replace(',', '.')) <= 0)
        return `Informe a comissão da faixa ${i + 1}.`
      if (!f.parcelasTxt || parseInt(f.parcelasTxt) <= 0)
        return `Informe em quantas parcelas a faixa ${i + 1} é paga.`
    }
    return null
  }

  function validarCalendario(): string | null {
    const fech = parseInt(fechamento), pag = parseInt(pagamento)
    if (!fech || fech < 1 || fech > 31) return 'Informe o dia de fechamento, entre 1 e 31.'
    if (!pag || pag < 1 || pag > 31) return 'Informe o dia de pagamento, entre 1 e 31.'
    return null
  }

  function avancarDeFaixas() {
    const problema = validarFaixas()
    if (problema) { setErro(problema); return }
    irPara('calendario')
  }
  function avancarDeCalendario() {
    const problema = validarCalendario()
    if (problema) { setErro(problema); return }
    irPara('estorno')
  }

  async function finalizar() {
    if (preview) { toast.success('Pré-visualização: nada foi salvo.'); return }
    setSalvando(true)
    const payload = {
      nomePolitica: 'Política do escritório',
      faixas: faixas.map((f, i) => ({
        min: minDaFaixa(i),
        max: f.semLimite || f.maxTxt.trim() === '' ? null : parseBRLParaCentavos(f.maxTxt),
        percentual: parseFloat(f.percentualTxt.replace(',', '.')) || 0,
        parcelas: parseInt(f.parcelasTxt) || 0,
      })),
      diaFechamento: parseInt(fechamento) || 0,
      diaPrimeiroPagamento: parseInt(pagamento) || 0,
      politicaEstorno: estorno,
    }
    const r = await salvarConfig(payload)
    setSalvando(false)
    if (!r.ok) { toast.error(r.erro); return }
    toast.success('Prontinho! Suas comissões já estão sendo calculadas.')
    // a navegação do app só é renderizada pelo layout do servidor depois que
    // existe configuração: sem recarregar, o corretor cairia no painel sem menu
    window.location.assign('/app')
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      {passo === 'boas-vindas' && (
        <div key="boas-vindas" className="entra flex min-h-[calc(100dvh-2rem)] flex-col items-center justify-center gap-6 relative overflow-hidden rounded-2xl superficie-marca px-6 py-16 text-center text-white">
          <div aria-hidden className="brilho-marca pointer-events-none absolute inset-0" />
          <CurvaMarca />
          <p className="text-xs font-medium tracking-[0.2em] text-escuro-texto uppercase">Komyx</p>
          <h1 className="text-3xl leading-tight font-semibold sm:text-4xl">
            Nunca mais calcule<br />comissão no Excel.
          </h1>
          <p className="max-w-xs text-escuro-texto">
            Me explique uma vez como seu escritório paga. Daqui pra frente eu faço as contas.
          </p>
          <Button size="toque" className="gap-2 bg-money-claro px-8 text-escuro hover:bg-money-claro/90" onClick={() => setPasso('faixas')}>
            Começar <ArrowRight size={18} />
          </Button>
        </div>
      )}

      {passo === 'faixas' && (
        <div key="faixas" className="entra space-y-6">
          <Progresso passo={passo} />
          <SecaoTitulo icone={TrendingUp} rotulo="Faixas de comissão" titulo="Como seu escritório calcula sua comissão?" />
          <div className="space-y-3">
            {faixas.map((f, i) => {
              const percentualOk = f.percentualTxt.trim() !== ''
              const parcelasOk = f.parcelasTxt.trim() !== ''
              const tetoOk = f.semLimite || f.maxTxt.trim() !== ''
              return (
                <div key={i} className="space-y-3 rounded-2xl border border-border/60 bg-card p-4">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>A partir de {formatBRL(minDaFaixa(i))}</span>
                    {faixas.length > 1 && (
                      <button type="button" onClick={() => setFaixas(fs => fs.filter((_, j) => j !== i))}>
                        <Trash2 size={18} className="text-muted-foreground" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <div className="col-span-2 space-y-1 sm:col-span-1">
                      <Label className="text-xs">Até</Label>
                      <CampoValor value={f.maxTxt} placeholder="Sem limite" disabled={f.semLimite}
                        onChange={v => setFaixas(fs => fs.map((x, j) => j === i ? { ...x, maxTxt: v } : x))} />
                      <label className="flex cursor-pointer items-center gap-2 pt-1 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          className="size-3.5 cursor-pointer accent-foreground"
                          checked={f.semLimite}
                          onChange={e => setFaixas(fs => fs.map((x, j) =>
                            j === i ? { ...x, semLimite: e.target.checked, maxTxt: e.target.checked ? '' : x.maxTxt } : x))}
                        />
                        Sem limite
                      </label>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Comissão</Label>
                      <CampoPercentual value={f.percentualTxt}
                        onChange={v => setFaixas(fs => fs.map((x, j) => j === i ? { ...x, percentualTxt: v } : x))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Parcelas</Label>
                      <CampoInteiro value={f.parcelasTxt} placeholder="2"
                        onChange={v => setFaixas(fs => fs.map((x, j) => j === i ? { ...x, parcelasTxt: v } : x))} />
                    </div>
                  </div>
                  {tetoOk && percentualOk && parcelasOk && (
                    <p className="text-sm text-muted-foreground">
                      {f.semLimite ? 'Sem limite' : `Até ${formatBRL(parseBRLParaCentavos(f.maxTxt))}`} → {f.percentualTxt}% → {f.parcelasTxt} parcelas
                    </p>
                  )}
                </div>
              )
            })}
            <Button type="button" variant="outline" size="sm"
              onClick={() => setFaixas(fs => [
                ...fs.map(x => ({ ...x, semLimite: false })),
                { maxTxt: '', percentualTxt: '', parcelasTxt: '', semLimite: true },
              ])}>
              <Plus size={18} /> Adicionar faixa
            </Button>
          </div>
          <Navegacao aoVoltar={() => irPara('boas-vindas')} aoContinuar={avancarDeFaixas} erro={erro} />
        </div>
      )}

      {passo === 'calendario' && (
        <div key="calendario" className="entra space-y-6">
          <Progresso passo={passo} />
          <SecaoTitulo icone={CalendarDays} rotulo="Calendário" titulo="Quando fecha o mês? Quando você recebe?" />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Dia do fechamento</Label>
              <CampoInteiro value={fechamento} onChange={setFechamento} />
            </div>
            <div className="space-y-1">
              <Label>Dia do pagamento</Label>
              <CampoInteiro value={pagamento} onChange={setPagamento} />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Venda até o dia {fechamento || '_'} entra no mês atual; a 1ª parcela cai no dia {pagamento || '_'} do mês seguinte.
          </p>
          <Navegacao aoVoltar={() => irPara('faixas')} aoContinuar={avancarDeCalendario} erro={erro} />
        </div>
      )}

      {passo === 'estorno' && (
        <div key="estorno" className="entra space-y-6">
          <Progresso passo={passo} />
          <SecaoTitulo icone={Undo2} rotulo="Estorno" titulo="E se o cliente desistir?" />
          <div className="space-y-2">
            {(Object.keys(ROTULOS_ESTORNO) as PoliticaEstorno[]).map(opcao => (
              <label
                key={opcao}
                className={cn('flex cursor-pointer gap-3 rounded-2xl border p-4',
                  estorno === opcao ? 'border-money/50 bg-money-soft' : 'border-border/60 hover:bg-muted')}
              >
                <input
                  type="radio"
                  name="politica-estorno"
                  className="mt-0.5 size-4 shrink-0 cursor-pointer accent-foreground"
                  checked={estorno === opcao}
                  onChange={() => setEstorno(opcao)}
                />
                <span className="space-y-0.5">
                  <span className="block text-sm font-medium">{ROTULOS_ESTORNO[opcao].titulo}</span>
                  <span className="block text-sm text-muted-foreground">{ROTULOS_ESTORNO[opcao].apoio}</span>
                </span>
              </label>
            ))}
          </div>
          <Navegacao aoVoltar={() => irPara('calendario')} aoContinuar={() => irPara('conclusao')} rotulo="Continuar" />
        </div>
      )}

      {passo === 'conclusao' && (
        <div key="conclusao" className="entra flex min-h-[calc(100dvh-2rem)] flex-col items-center justify-center gap-6 relative overflow-hidden rounded-2xl superficie-marca px-6 py-16 text-center text-white">
          <div aria-hidden className="brilho-marca pointer-events-none absolute inset-0" />
          <CurvaMarca />
          <p className="text-4xl">🎉</p>
          <h2 className="text-3xl font-semibold sm:text-4xl">Tudo pronto.</h2>
          <p className="max-w-xs text-escuro-texto">Agora é só registrar sua primeira venda.</p>
          <Button size="toque" disabled={salvando}
            className="gap-2 bg-money-claro px-8 text-escuro hover:bg-money-claro/90" onClick={finalizar}>
            {salvando ? 'Preparando…' : 'Começar a usar o Komyx'} <ArrowRight size={18} />
          </Button>
          <button type="button" onClick={() => irPara('estorno')} className="text-sm text-escuro-texto underline underline-offset-4">
            Revisar respostas
          </button>
        </div>
      )}
    </div>
  )
}
