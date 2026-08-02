'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { salvarConfig } from '@/lib/actions/config'
import { configFinanceiraSchema } from '@/lib/domain/schemas'
import { calcularCompetencia } from '@/lib/engine/calculo'
import { parseBRLParaCentavos, formatBRL, formatData, formatPercentual } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CampoValor, CampoPercentual, CampoInteiro } from '@/components/campos'
import { Valor } from '@/components/valor'
import { ROTULOS_ESTORNO, type PoliticaEstorno } from '@/lib/domain/types'
import { cn } from '@/lib/utils'
import { Trash2, Plus, Copy, Building2, TrendingUp, CalendarDays, Undo2, type LucideIcon } from 'lucide-react'

export function Secao({ titulo, apoio, icone: Icone, children }: {
  titulo: string; apoio: string; icone: LucideIcon; children: React.ReactNode
}) {
  return (
    <section className="entra-suave space-y-4 rounded-[10px] border bg-card p-4 md:p-5">
      <div className="flex items-start gap-2.5">
        <Icone size={18} className="mt-0.5 shrink-0 text-muted-foreground" />
        <div className="space-y-1">
          <h2 className="font-medium">{titulo}</h2>
          <p className="text-sm text-muted-foreground">{apoio}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

/*
 * O corretor informa o PISO de cada faixa, não o teto.
 *
 * Antes o campo era "vendido até", e o piso da faixa seguinte nascia com um
 * centavo a mais. Quem lê a política do escritório como "atingiu 1,5 milhão,
 * vira 0,7%" digitava 1.500.000,00 no teto e o mês que fechasse exatamente em
 * 1,5 milhão ficava na faixa de baixo — o corte caía um centavo longe do que a
 * pessoa quis dizer, e nada na tela mostrava isso.
 *
 * Com piso, o número digitado é o ponto em que a faixa passa a valer: vendeu
 * 1.500.000,00, está na faixa que começa em 1.500.000,00. O banco continua
 * guardando min e max — o teto de cada faixa é derivado do piso da seguinte,
 * então as faixas não têm como se sobrepor nem deixar buraco.
 */
type FaixaDraft = { minTxt: string; percentualTxt: string; parcelasTxt: string }
type ErroFaixa = { min?: string; percentual?: string; parcelas?: string; geral?: string }
type Issue = { path: (string | number)[]; message: string }

/**
 * Reaproveita as mensagens do configFinanceiraSchema (não duplica regra) e as
 * organiza por índice de faixa + campo, para o formulário mostrar o erro
 * embaixo do input certo em vez de um toast genérico.
 *
 * O schema fala em `max`, que aqui não é campo de ninguém: o teto da faixa i é
 * o piso da faixa i+1 menos um centavo. Então o erro do teto de i é culpa do
 * piso de i+1, e é lá que ele aparece.
 */
function mapearErrosFaixas(issues: Issue[]): Record<number, ErroFaixa> {
  const mapa: Record<number, ErroFaixa> = {}
  const anotar = (idx: number, campo: keyof ErroFaixa, mensagem: string) => {
    const atual = mapa[idx] ?? {}
    atual[campo] = atual[campo] ?? mensagem
    mapa[idx] = atual
  }
  for (const issue of issues) {
    if (issue.path[0] !== 'faixas') continue
    const idx = issue.path[1]
    if (typeof idx !== 'number') continue
    const campo = issue.path[2]
    if (campo === 'max') anotar(idx + 1, 'min', 'Precisa ser maior que o início da faixa anterior.')
    else if (campo === 'percentual' || campo === 'parcelas') anotar(idx, campo, issue.message)
    else anotar(idx, 'geral', issue.message)
  }
  return mapa
}

export function ConfigForm({ modo, inicial }: {
  modo: 'onboarding' | 'edicao'
  inicial?: { nomePolitica: string; faixas: { min: number; percentual: number; parcelas: number }[];
              diaFechamento: number; diaPrimeiroPagamento: number; politicaEstorno: PoliticaEstorno }
}) {
  const router = useRouter()
  const qc = useQueryClient()
  const [nome, setNome] = useState(inicial?.nomePolitica ?? 'Política do escritório')
  const [faixas, setFaixas] = useState<FaixaDraft[]>(
    inicial?.faixas.map(f => ({
      // a primeira faixa começa em zero por definição e não tem campo
      minTxt: f.min === 0 ? '' : (f.min / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      // duas casas para bater com a máscara: sem isso, "0,5" viraria "0,05"
      // assim que o corretor tocasse no campo
      percentualTxt: f.percentual.toFixed(2).replace('.', ','),
      parcelasTxt: String(f.parcelas),
    })) ?? [{ minTxt: '', percentualTxt: '', parcelasTxt: '' }])
  const [fechamento, setFechamento] = useState(String(inicial?.diaFechamento ?? 25))
  const [pagamento, setPagamento] = useState(String(inicial?.diaPrimeiroPagamento ?? 10))
  const [estorno, setEstorno] = useState<PoliticaEstorno>(inicial?.politicaEstorno ?? 'perguntar')
  const [salvando, setSalvando] = useState(false)
  const [valorSimulado, setValorSimulado] = useState('')

  /** piso da faixa: zero na primeira, o que o corretor digitou nas outras */
  function pisoDaFaixa(i: number): number {
    return i === 0 ? 0 : parseBRLParaCentavos(faixas[i].minTxt)
  }

  /** teto: um centavo antes do piso da próxima; a última não tem */
  function tetoDaFaixa(i: number): number | null {
    return i === faixas.length - 1 ? null : pisoDaFaixa(i + 1) - 1
  }

  const payload = useMemo(() => {
    const listaFaixas = faixas.map((f, i) => ({
      min: i === 0 ? 0 : parseBRLParaCentavos(f.minTxt),
      max: i === faixas.length - 1 ? null : parseBRLParaCentavos(faixas[i + 1].minTxt) - 1,
      percentual: parseFloat(f.percentualTxt.replace(',', '.')) || 0,
      parcelas: parseInt(f.parcelasTxt) || 0,
    }))
    return {
      nomePolitica: nome,
      faixas: listaFaixas,
      diaFechamento: parseInt(fechamento) || 0,
      diaPrimeiroPagamento: parseInt(pagamento) || 0,
      politicaEstorno: estorno,
    }
  }, [nome, faixas, fechamento, pagamento, estorno])

  // única fonte de validação: o mesmo schema usado ao salvar no servidor.
  // Validar aqui só evita a viagem até o servidor para descobrir o que já dá
  // pra saber no cliente — a regra em si mora só no schemas.ts
  const parseResult = useMemo(() => configFinanceiraSchema.safeParse(payload), [payload])
  const issues = useMemo<Issue[]>(() => parseResult.success ? [] : (parseResult.error.issues as Issue[]), [parseResult])
  const errosFaixas = useMemo(() => mapearErrosFaixas(issues), [issues])
  const erroNome = issues.find(i => i.path[0] === 'nomePolitica')?.message
  const erroFechamento = issues.find(i => i.path[0] === 'diaFechamento')?.message
  const erroPagamento = issues.find(i => i.path[0] === 'diaPrimeiroPagamento')?.message

  // não mostra erro de faixa vazia assim que a tela abre (onboarding começa
  // em branco); no modo de edição os campos já vêm preenchidos, então mostra
  // sempre
  function tocado(f: FaixaDraft): boolean {
    return modo === 'edicao' || f.minTxt.trim() !== '' || f.percentualTxt.trim() !== '' || f.parcelasTxt.trim() !== ''
  }

  const resultadoSimulacao = useMemo(() => {
    if (!parseResult.success) return null
    const centavos = parseBRLParaCentavos(valorSimulado)
    if (centavos <= 0) return null
    const hoje = new Date()
    return calcularCompetencia({
      config: {
        faixas: parseResult.data.faixas,
        calendario: { diaFechamento: parseResult.data.diaFechamento, diaPrimeiroPagamento: parseResult.data.diaPrimeiroPagamento },
      },
      competencia: { ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 },
      vendas: [{ id: 'simulacao', valorCartaCentavos: centavos, status: 'confirmada' }],
      recebimentosExistentes: [],
      hoje: new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }),
    })
  }, [parseResult, valorSimulado])
  const comissaoSimulada = resultadoSimulacao?.comissoes[0]

  function duplicarUltimaFaixa() {
    // ponto de partida para uma variação da política: copia comissão e
    // parcelas da última faixa em vez de deixar tudo em branco. O piso fica em
    // branco porque é justamente o que distingue a faixa nova da anterior.
    setFaixas(fs => {
      const ultima = fs[fs.length - 1]
      return [...fs, { minTxt: '', percentualTxt: ultima.percentualTxt, parcelasTxt: ultima.parcelasTxt }]
    })
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!parseResult.success) {
      toast.error(parseResult.error.issues[0]?.message ?? 'Corrija os erros antes de salvar.')
      return
    }
    setSalvando(true)
    const r = await salvarConfig(payload)
    setSalvando(false)
    if (!r.ok) { toast.error(r.erro); return }
    qc.invalidateQueries()
    if (modo === 'onboarding') {
      toast.success('Tudo pronto! Agora é só registrar suas vendas.')
      // a navegação do app só aparece depois que existe configuração, e quem
      // decide isso é o layout no servidor: sem recarregar, o corretor cairia
      // no painel sem menu nenhum
      window.location.assign('/app')
    } else {
      toast.success('Regras salvas. O mês atual foi recalculado com as novas regras.')
      router.refresh()
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Secao titulo="Política" apoio="Um nome para você reconhecer essa regra de comissão depois." icone={Building2}>
        <div className="space-y-1">
          <Label>Nome da política</Label>
          <Input value={nome} onChange={e => setNome(e.target.value)} required
            className={erroNome ? 'border-destructive' : undefined} />
          {erroNome && <p className="text-xs text-destructive">{erroNome}</p>}
        </div>
      </Secao>

      <Secao titulo="Faixas" apoio="Comissão calculada pelo total vendido no mês. Informe a partir de quanto cada faixa passa a valer — vendeu exatamente esse valor, já está nela." icone={TrendingUp}>
        <div className="space-y-3">
          {faixas.map((f, i) => {
            const erro = errosFaixas[i]
            const mostrarErro = tocado(f)
            return (
              <div key={i} className={cn('space-y-3 rounded-[10px] bg-muted/40 p-3',
                mostrarErro && erro && 'ring-1 ring-destructive/50')}>
                <div className="flex items-center justify-between text-sm font-medium">
                  {/* mostra o intervalo fechado que a faixa cobre: com o piso
                      digitado, é aqui que o corretor confere onde ficou o corte */}
                  <span>Faixa {i + 1} — {tetoDaFaixa(i) === null
                    ? `de ${formatBRL(pisoDaFaixa(i))} em diante`
                    : `${formatBRL(pisoDaFaixa(i))} a ${formatBRL(tetoDaFaixa(i)!)}`}</span>
                  {faixas.length > 1 && (
                    <button type="button" onClick={() => setFaixas(fs => fs.filter((_, j) => j !== i))}>
                      <Trash2 size={18} className="text-muted-foreground" />
                    </button>)}
                </div>
                {mostrarErro && erro?.geral && <p className="text-xs text-destructive">{erro.geral}</p>}
                {/* no celular os três campos lado a lado truncam o "Sem limite":
                    o valor ocupa a linha inteira e os dois curtos dividem a de baixo */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <div className="col-span-2 space-y-1 sm:col-span-1">
                    <Label className="text-xs">A partir de</Label>
                    {/* a primeira faixa começa em zero por definição: campo
                        travado em vez de escondido, para a coluna não desalinhar */}
                    <CampoValor value={i === 0 ? '0,00' : f.minTxt} disabled={i === 0}
                      className={mostrarErro && erro?.min ? 'border-destructive' : undefined}
                      onChange={v => setFaixas(fs => fs.map((x, j) => j === i ? { ...x, minTxt: v } : x))} />
                    {mostrarErro && erro?.min && <p className="text-xs text-destructive">{erro.min}</p>}
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Comissão</Label>
                    <CampoPercentual value={f.percentualTxt} required
                      className={mostrarErro && erro?.percentual ? 'border-destructive' : undefined}
                      onChange={v => setFaixas(fs => fs.map((x, j) => j === i ? { ...x, percentualTxt: v } : x))} />
                    {mostrarErro && erro?.percentual && <p className="text-xs text-destructive">{erro.percentual}</p>}
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Parcelas</Label>
                    <CampoInteiro value={f.parcelasTxt} placeholder="2" required
                      className={mostrarErro && erro?.parcelas ? 'border-destructive' : undefined}
                      onChange={v => setFaixas(fs => fs.map((x, j) => j === i ? { ...x, parcelasTxt: v } : x))} />
                    {mostrarErro && erro?.parcelas && <p className="text-xs text-destructive">{erro.parcelas}</p>}
                  </div>
                </div>
              </div>
            )
          })}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm"
              // a nova faixa entra no fim e passa a ser a aberta; a anterior
              // ganha teto sozinha, derivado deste piso
              onClick={() => setFaixas(fs => [...fs, { minTxt: '', percentualTxt: '', parcelasTxt: '' }])}>
              <Plus size={18} /> Adicionar faixa
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={duplicarUltimaFaixa}
              title="Copia a comissão e as parcelas da última faixa, para você não redigitar tudo">
              <Copy size={18} /> Duplicar
            </Button>
          </div>
        </div>

        <div className="space-y-3 rounded-[10px] bg-money-soft p-3 md:p-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Simule uma venda</p>
            <p className="text-xs text-muted-foreground">Veja a faixa aplicada, a comissão e as parcelas antes de salvar.</p>
          </div>
          <div className="max-w-[220px]">
            <CampoValor value={valorSimulado} onChange={setValorSimulado} placeholder="Valor da carta" />
          </div>
          {!parseResult.success && valorSimulado.trim() !== '' && (
            <p className="text-xs text-muted-foreground">Corrija as faixas acima para simular.</p>
          )}
          {resultadoSimulacao && comissaoSimulada && (
            <div key={valorSimulado} className="entra-suave space-y-3 rounded-[10px] bg-escuro p-4 text-white">
              <div className="flex items-center justify-between">
                <span className="text-sm text-escuro-texto">Faixa aplicada</span>
                <span className="text-sm font-medium">{formatPercentual(comissaoSimulada.percentual)} de comissão</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-escuro-texto">Comissão total</span>
                <Valor centavos={comissaoSimulada.valorCentavos} className="text-money-claro" />
              </div>
              <div className="space-y-1.5 border-t border-white/10 pt-3">
                <span className="text-sm text-escuro-texto">Parcelas previstas</span>
                {resultadoSimulacao.recebimentosPrevistos.map(r => (
                  <div key={r.numeroParcela} className="flex items-center justify-between text-sm">
                    <span>{r.numeroParcela}ª parcela — {formatData(r.dataPrevista)}</span>
                    <Valor centavos={r.valorCentavos} className="text-money-claro" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Secao>

      <Secao titulo="Calendário" apoio="Vendas até o dia do fechamento entram no mês atual; depois disso, no mês seguinte. A primeira parcela é paga no dia do pagamento do mês seguinte." icone={CalendarDays}>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Dia do fechamento</Label>
            <CampoInteiro value={fechamento} onChange={setFechamento} required
              className={erroFechamento ? 'border-destructive' : undefined} />
            {erroFechamento && <p className="text-xs text-destructive">{erroFechamento}</p>}
          </div>
          <div className="space-y-1"><Label>Dia do pagamento</Label>
            <CampoInteiro value={pagamento} onChange={setPagamento} required
              className={erroPagamento ? 'border-destructive' : undefined} />
            {erroPagamento && <p className="text-xs text-destructive">{erroPagamento}</p>}
          </div>
        </div>
      </Secao>

      <Secao titulo="Estorno" apoio="O que o escritório faz com a sua comissão quando o cliente desiste da cota." icone={Undo2}>
        <div className="space-y-2">
          {(Object.keys(ROTULOS_ESTORNO) as PoliticaEstorno[]).map(opcao => (
            <label
              key={opcao}
              className={cn('flex cursor-pointer gap-3 rounded-[10px] border p-3',
                estorno === opcao ? 'border-foreground/40 bg-background' : 'hover:bg-background')}
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
      </Secao>

      <Button type="submit" className="w-full" disabled={salvando || !parseResult.success}>
        {salvando ? 'Salvando…' : 'Salvar regras'}
      </Button>
    </form>
  )
}
