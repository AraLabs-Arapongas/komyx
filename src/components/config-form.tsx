'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { salvarConfig } from '@/lib/actions/config'
import { configFinanceiraSchema } from '@/lib/domain/schemas'
import { parseBRLParaCentavos, formatBRL } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Passos, BlocoRevisao, type Passo as PassoConfig } from '@/components/ui/passos'
import { Label } from '@/components/ui/label'
import { CampoValor, CampoPercentual, CampoInteiro, CampoFatia } from '@/components/campos'
import { ROTULOS_ESTORNO, type PoliticaEstorno } from '@/lib/domain/types'
import { cn } from '@/lib/utils'
import { Trash2, Plus, Copy, TrendingUp, CalendarDays, Undo2, type LucideIcon } from 'lucide-react'

/**
 * Bloco de conteúdo de um formulário longo.
 *
 * O cabeçalho é opcional: quando a página inteira trata de um assunto só, o
 * título já está no h1 dela, e repeti-lo dentro do cartão faz a tela dizer a
 * mesma palavra duas vezes seguidas.
 */
export function Secao({ titulo, apoio, icone: Icone, children }: {
  titulo?: string; apoio?: string; icone?: LucideIcon; children: React.ReactNode
}) {
  return (
    <section className="entra-suave space-y-4 rounded-lg border bg-card p-4 md:p-5">
      {titulo && (
        <div className="flex items-start gap-2.5">
          {Icone && <Icone size={18} className="mt-0.5 shrink-0 text-muted-foreground" />}
          <div className="space-y-1">
            <h2 className="font-medium">{titulo}</h2>
            {apoio && <p className="text-sm text-muted-foreground">{apoio}</p>}
          </div>
        </div>
      )}
      {children}
    </section>
  )
}

/*
 * Sem `semLimite`: ser a última faixa JÁ significa não ter teto, e manter as
 * duas coisas separadas permitia estados que não existem — a última marcada
 * como limitada, ou uma do meio marcada como aberta, deixando um buraco acima.
 */
type FaixaDraft = {
  maxTxt: string; percentualTxt: string; parcelasTxt: string
  /** vazio = divide igual; um texto por parcela quando o escritório reparte diferente */
  fatiasTxt: string[]
}
type ErroFaixa = { max?: string; percentual?: string; parcelas?: string; distribuicao?: string; geral?: string }
type Issue = { path: (string | number)[]; message: string }

/**
 * Reaproveita as mensagens do configFinanceiraSchema (não duplica regra) e as
 * organiza por índice de faixa + campo, para o formulário mostrar o erro
 * embaixo do input certo em vez de um toast genérico.
 */
function mapearErrosFaixas(issues: Issue[]): Record<number, ErroFaixa> {
  const mapa: Record<number, ErroFaixa> = {}
  for (const issue of issues) {
    if (issue.path[0] !== 'faixas') continue
    const idx = issue.path[1]
    if (typeof idx !== 'number') continue
    const campo = issue.path[2]
    const atual = mapa[idx] ?? {}
    if (campo === 'max' || campo === 'percentual' || campo === 'parcelas' || campo === 'distribuicao') atual[campo] = issue.message
    else atual.geral = atual.geral ?? issue.message
    mapa[idx] = atual
  }
  return mapa
}

export function ConfigForm({ modo, inicial, salvarComo, aposSalvar }: {
  modo: 'onboarding' | 'edicao'
  inicial?: { nomePolitica: string; faixas: { max: number | null; percentual: number; parcelas: number; distribuicao?: number[] | null }[];
              diaFechamento: number; diaPrimeiroPagamento: number; politicaEstorno: PoliticaEstorno }
  /*
   * Grava em outro escopo — a política do escritório usa o mesmo formulário,
   * porque as perguntas são idênticas; só muda de quem é a resposta. Sem isto
   * a página de políticas duplicaria os quatro passos inteiros, e é
   * exatamente a divergência que o design system existe para evitar.
   */
  salvarComo?: (payload: import('@/lib/domain/schemas').ConfigFinanceiraForm) => Promise<{ ok: boolean; erro?: string }>
  aposSalvar?: () => void
}) {
  const router = useRouter()
  const qc = useQueryClient()
  /*
   * O nome da política não é campo: o corretor tem uma política só, a do
   * escritório dele, e batizá-la era uma pergunta sem consequência — nada no
   * produto mostra esse nome. Um valor já salvo é preservado; o resto nasce com
   * o padrão.
   */
  const nome = inicial?.nomePolitica?.trim() || 'Política do escritório'
  const [faixas, setFaixas] = useState<FaixaDraft[]>(
    inicial?.faixas.map(f => ({
      maxTxt: f.max === null ? '' : (f.max / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      // duas casas para bater com a máscara: sem isso, "0,5" viraria "0,05"
      // assim que o corretor tocasse no campo
      percentualTxt: f.percentual.toFixed(2).replace('.', ','),
      parcelasTxt: String(f.parcelas),
      fatiasTxt: (f.distribuicao ?? []).map(p => String(p).replace('.', ',')),
    })) ?? [{ maxTxt: '', percentualTxt: '', parcelasTxt: '', fatiasTxt: [] }])
  const [fechamento, setFechamento] = useState(String(inicial?.diaFechamento ?? 25))
  const [pagamento, setPagamento] = useState(String(inicial?.diaPrimeiroPagamento ?? 10))
  const [estorno, setEstorno] = useState<PoliticaEstorno>(inicial?.politicaEstorno ?? 'perguntar')
  const [salvando, setSalvando] = useState(false)
  const [passoAtual, setPassoAtual] = useState(0)

  function minDaFaixa(i: number): number {
    if (i === 0) return 0
    const antMax = parseBRLParaCentavos(faixas[i - 1].maxTxt)
    return antMax + 1
  }

  const payload = useMemo(() => {
    // recalcula o "min" acumulado aqui em vez de chamar minDaFaixa (que só
    // existe para o rótulo "a partir de X" na tela): mantém o useMemo
    // dependente só de estado, sem precisar listar uma função como dependência.
    // reduce em vez de reatribuir uma variável: evita mutação dentro do render
    const { itens: listaFaixas } = faixas.reduce<{ acumulado: number; itens: { min: number; max: number | null; percentual: number; parcelas: number; distribuicao: number[] | null }[] }>(
      (estado, f) => {
        const min = estado.acumulado
        // a última faixa vai até o infinito; as outras precisam do teto digitado
        const ultima = estado.itens.length === faixas.length - 1
        const max = ultima || f.maxTxt.trim() === '' ? null : parseBRLParaCentavos(f.maxTxt)
        return {
          acumulado: max !== null ? max + 1 : estado.acumulado,
          itens: [...estado.itens, {
            min, max,
            percentual: parseFloat(f.percentualTxt.replace(',', '.')) || 0,
            parcelas: parseInt(f.parcelasTxt) || 0,
            // nenhuma fatia preenchida significa divisão igual, não zero
            distribuicao: f.fatiasTxt.some(x => x.trim() !== '')
              ? f.fatiasTxt.map(x => parseFloat(x.replace(',', '.')) || 0)
              : null,
          }],
        }
      }, { acumulado: 0, itens: [] })
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
  const erroFechamento = issues.find(i => i.path[0] === 'diaFechamento')?.message
  const erroPagamento = issues.find(i => i.path[0] === 'diaPrimeiroPagamento')?.message

  /*
   * O vermelho só nasce depois de uma tentativa de seguir em frente — mesma
   * regra dos outros formulários. Antes ele aparecia no instante em que se
   * adicionava uma faixa: a nova nascia vazia e a anterior passava a precisar
   * de teto, então três erros pintavam antes de a pessoa digitar qualquer
   * coisa, acusando-a de algo que ela não teve chance de fazer.
   */
  const [tentouSeguir, setTentouSeguir] = useState(false)


  /**
   * Escreve o teto de uma faixa. Preencher o da última cria a próxima, vazia:
   * é assim que a escada cresce de baixo para cima, sem passar pelo botão.
   */
  function encostarTeto(indice: number, valor: string) {
    setFaixas(fs => {
      const atualizadas = fs.map((x, j) => (j === indice ? { ...x, maxTxt: valor } : x))
      const eraUltima = indice === fs.length - 1
      const ganhouTeto = fs[indice].maxTxt.trim() === '' && valor.trim() !== ''
      if (!eraUltima || !ganhouTeto) return atualizadas
      setTentouSeguir(false)
      return [...atualizadas, { maxTxt: '', percentualTxt: '', parcelasTxt: '', fatiasTxt: [] }]
    })
  }

  /*
   * Acrescentar faixa apaga a marca de "já tentou seguir".
   *
   * Sem isso, quem já tinha clicado em Continuar uma vez via a faixa seguinte
   * nascer vermelha: a marca ficava ligada para sempre e valia para campos que
   * ainda não existiam quando a tentativa aconteceu. O formulário mudou de
   * forma; a tentativa anterior não descreve mais ele.
   */
  function acrescentarFaixa(nova: FaixaDraft) {
    setTentouSeguir(false)
    setFaixas(fs => [...fs, nova])
  }

  /**
   * Apaga uma faixa e conserta o topo.
   *
   * O teto de uma faixa só existe para separá-la da que está acima. Ao apagar a
   * do topo, quem assume o lugar dela fica com um teto que não separa de nada —
   * e a política passaria a não cobrir os valores acima dele. Então esse número
   * sai junto.
   */
  function removerFaixa(indice: number) {
    setFaixas(fs => {
      const restantes = fs.filter((_, j) => j !== indice)
      if (restantes.length === 0) return fs
      return restantes.map((f, j) => (j === restantes.length - 1 ? { ...f, maxTxt: '' } : f))
    })
  }

  function nParcelas(f: FaixaDraft): number {
    return parseInt(f.parcelasTxt) || 0
  }

  function fechaEmCem(f: FaixaDraft): boolean {
    const soma = f.fatiasTxt.reduce((s, x) => s + (parseFloat(x.replace(',', '.')) || 0), 0)
    return Math.round(soma * 100) / 100 === 100
  }

  function somaFatias(f: FaixaDraft): string {
    const soma = f.fatiasTxt.reduce((s, x) => s + (parseFloat(x.replace(',', '.')) || 0), 0)
    return (Math.round(soma * 100) / 100).toLocaleString('pt-BR')
  }

  /** Abre as fatias já preenchidas com a divisão igual, que é de onde se parte. */
  function abrirFatias(indice: number) {
    setFaixas(fs => fs.map((f, j) => {
      if (j !== indice) return f
      const n = parseInt(f.parcelasTxt) || 0
      if (n < 2) return f
      const igual = Math.round((100 / n) * 100) / 100
      const fatias = Array.from({ length: n }, () => String(igual).replace('.', ','))
      // o resto da divisão vai na última, para o campo já abrir somando 100
      const resto = Math.round((100 - igual * n) * 100) / 100
      if (resto !== 0) {
        fatias[n - 1] = String(Math.round((igual + resto) * 100) / 100).replace('.', ',')
      }
      return { ...f, fatiasTxt: fatias }
    }))
  }

  function fecharFatias(indice: number) {
    setFaixas(fs => fs.map((f, j) => (j === indice ? { ...f, fatiasTxt: [] } : f)))
  }

  /** Mudar o número de parcelas com fatias abertas as reajusta ao novo tamanho. */
  function mudarParcelas(indice: number, valor: string) {
    setFaixas(fs => fs.map((f, j) => {
      if (j !== indice) return f
      if (f.fatiasTxt.length === 0) return { ...f, parcelasTxt: valor }
      const n = parseInt(valor) || 0
      const fatias = Array.from({ length: n }, (_, k) => f.fatiasTxt[k] ?? '')
      return { ...f, parcelasTxt: valor, fatiasTxt: fatias }
    }))
  }

  function duplicarUltimaFaixa() {
    // ponto de partida para uma variação da política: copia comissão e
    // parcelas da última faixa em vez de deixar tudo em branco
    const ultima = faixas[faixas.length - 1]
    acrescentarFaixa({ maxTxt: '', percentualTxt: ultima.percentualTxt, parcelasTxt: ultima.parcelasTxt, fatiasTxt: [...ultima.fatiasTxt] })
  }

  async function salvar() {
    if (!parseResult.success) {
      toast.error(parseResult.error.issues[0]?.message ?? 'Corrija os erros antes de salvar.')
      return
    }
    setSalvando(true)
    const r = await (salvarComo ?? salvarConfig)(payload)
    setSalvando(false)
    if (!r.ok) { toast.error(r.erro ?? 'Não foi possível salvar.'); return }
    qc.invalidateQueries()
    if (aposSalvar) { aposSalvar(); return }
    if (modo === 'onboarding') {
      toast.success('Tudo pronto! Agora é só registrar suas vendas.')
      // a navegação do app só aparece depois que existe configuração, e quem
      // decide isso é o layout no servidor: sem recarregar, o corretor cairia
      // no painel sem menu nenhum
      window.location.assign('/app')
    } else {
      toast.success('Regras salvas. O mês atual foi recalculado com as novas regras.')
      // volta para o perfil: salvar é o fim do que se veio fazer aqui, e ficar
      // no formulário depois de gravar deixa a dúvida de se foi mesmo
      router.push('/app/perfil')
    }
  }

  /*
   * Um assunto por tela, como no cadastro de venda. Ajustes é o formulário mais
   * longo do app: numa página só, quem vinha trocar o percentual de uma faixa
   * atravessava política, calendário e estorno até achar o botão.
   *
   * A validação continua sendo do schema — `podeAvancar` só impede sair de um
   * passo que ainda tem erro, e o erro já pinta embaixo do campo.
   */
  const PASSOS: PassoConfig[] = [
    {
      titulo: 'Faixas de comissão',
      conteudo: (
        <Secao titulo="Faixas" apoio="Comissão calculada pelo total vendido no mês. A última faixa vale de seu início para cima." icone={TrendingUp}>
        <div className="space-y-3">
        {/* as ações ficam antes da lista: no fim, cada faixa adicionada empurrava
        os botões para baixo e obrigava a rolar de novo para adicionar a próxima */}
        <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm"
        onClick={() => acrescentarFaixa({ maxTxt: '', percentualTxt: '', parcelasTxt: '', fatiasTxt: [] })}>
        <Plus size={18} /> Adicionar faixa
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={duplicarUltimaFaixa}
        title="Copia a comissão e as parcelas da última faixa, para você não redigitar tudo">
        <Copy size={18} /> Duplicar
        </Button>
        </div>
        {/*
          Da última para a primeira: a faixa nova nasce ao preencher o teto da
          anterior e, na ordem natural, ela aparecia embaixo — fora da tela, sob
          o dedo que acabou de digitar. Aqui ela surge no topo, empurrando as
          já preenchidas para baixo.

          O índice continua sendo o real: o `min` de cada faixa, os erros e o
          botão de apagar dependem da posição de verdade, não da exibida.
        */}
        {faixas.map((_, i) => faixas.length - 1 - i).map(i => {
        const f = faixas[i]
        const erro = errosFaixas[i]
        const mostrarErro = tentouSeguir
        const ultima = i === faixas.length - 1
        return (
        <div key={i} className={cn('space-y-3 rounded-lg bg-muted/40 p-3',
        mostrarErro && erro && 'ring-1 ring-destructive/50')}>
        <div className="flex items-center justify-between text-sm font-medium">
        <span>Faixa {i + 1} — de {formatBRL(minDaFaixa(i))}{ultima ? ' para cima' : ''}</span>
        {faixas.length > 1 && (
        <button type="button" onClick={() => removerFaixa(i)}>
        <Trash2 size={18} className="text-muted-foreground" />
        </button>)}
        </div>
        {mostrarErro && erro?.geral && <p className="text-xs text-destructive">{erro.geral}</p>}
        {/* no celular os três campos lado a lado truncam o "Sem limite":
        o valor ocupa a linha inteira e os dois curtos dividem a de baixo */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {/*
          O teto da ÚLTIMA faixa também é editável, e preenchê-lo cria a próxima
          sozinho.
          
          O escritório descreve a política de baixo para cima — "até 500 mil é
          0,5%, daí até 1,5 milhão é 0,6%, acima disso 0,7%" — e antes era preciso
          clicar em "adicionar" para só então poder digitar o teto da primeira.
          Escrever a escada começava pelo degrau de cima. Agora não: vazio
          significa "é a última, sem teto", e digitar um valor abre o degrau
          seguinte.
        */}
        <div className="col-span-2 space-y-1 sm:col-span-1">
        <Label className="text-xs">Vendido até</Label>
        <CampoValor value={f.maxTxt} placeholder={ultima ? 'Sem teto' : undefined}
        className={mostrarErro && erro?.max ? 'border-destructive' : undefined}
        onChange={v => encostarTeto(i, v)} />
        {mostrarErro && erro?.max
        ? <p className="text-xs text-destructive">{erro.max}</p>
        : ultima && <p className="text-xs text-muted-foreground">
        Em branco, esta faixa vale daqui para cima.
        </p>}
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
        onChange={v => mudarParcelas(i, v)} />
        {mostrarErro && erro?.parcelas && <p className="text-xs text-destructive">{erro.parcelas}</p>}
        </div>
        </div>

        {/*
          Repartir diferente é exceção: a maioria dos escritórios divide igual, e
          quem divide igual não deve nem ver esses campos. Quem não divide
          precisa deles, porque supor divisão igual mostrava na agenda uma data
          com valor que não era o dela.
        */}
        {nParcelas(f) > 1 && (
        f.fatiasTxt.length === 0 ? (
        <button type="button" onClick={() => abrirFatias(i)}
        className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">
        As parcelas não são iguais?
        </button>
        ) : (
        <div className="space-y-2 rounded-lg bg-card p-3">
        <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium">Quanto cai em cada parcela</p>
        <button type="button" onClick={() => fecharFatias(i)}
        className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">
        Dividir igual
        </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
        {f.fatiasTxt.map((fatia, k) => (
        <div key={k} className="space-y-1">
        <Label className="text-xs text-muted-foreground">{k + 1}ª</Label>
        <CampoFatia value={fatia}
        onChange={v => setFaixas(fs => fs.map((x, j) => j === i
        ? { ...x, fatiasTxt: x.fatiasTxt.map((y, m) => (m === k ? v : y)) } : x))} />
        </div>
        ))}
        </div>
        {/* cobra só enquanto não fecha: repetir "precisa dar 100%" com a soma
        já em 100 faz o certo parecer errado */}
        {mostrarErro && erro?.distribuicao
        ? <p className="text-xs text-destructive">{erro.distribuicao}</p>
        : fechaEmCem(f)
        ? <p className="text-xs text-money">Somam 100%.</p>
        : <p className="text-xs text-muted-foreground">Somam {somaFatias(f)}% — precisa dar 100%.</p>}
        </div>
        ))}
        </div>
        )
        })}
        </div>

        </Secao>
      ),
    },
    {
      titulo: 'Calendário',
      conteudo: (
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
      ),
    },
    {
      titulo: 'Estorno',
      conteudo: (
        <Secao titulo="Estorno" apoio="O que o escritório faz com a sua comissão quando o cliente desiste da cota." icone={Undo2}>
        <div className="space-y-2">
        {(Object.keys(ROTULOS_ESTORNO) as PoliticaEstorno[]).map(opcao => (
        <label
        key={opcao}
        className={cn('flex cursor-pointer gap-3 rounded-lg border p-3',
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
      ),
    },
    {
      titulo: 'Confira antes de salvar',
      conteudo: (
        <div className="space-y-3">
          {/* um bloco por passo, na ordem em que se preencheu: revisar é
              reler o que se respondeu, não reabrir o formulário inteiro */}
          <BlocoRevisao titulo="Faixas de comissão" aoEditar={() => setPassoAtual(0)}>
            {faixas.map((f, i) => (
              <p key={i}>
                De {formatBRL(minDaFaixa(i))} {f.maxTxt.trim() ? `até R$ ${f.maxTxt}` : 'para cima'} —{' '}
                {f.percentualTxt || '?'}% em {f.parcelasTxt || '?'}x
                {f.fatiasTxt.some(x => x.trim()) && ` (parcelas de ${f.fatiasTxt.map(x => x || '0').join('% / ')}%)`}
              </p>
            ))}
          </BlocoRevisao>
          <BlocoRevisao titulo="Calendário" aoEditar={() => setPassoAtual(1)}>
            <p>Vendas entram no mês até o dia {fechamento || '?'}.</p>
            <p>Primeira parcela cai no dia {pagamento || '?'} do mês seguinte.</p>
          </BlocoRevisao>
          <BlocoRevisao titulo="Estorno" aoEditar={() => setPassoAtual(2)}>
            <p>{ROTULOS_ESTORNO[estorno].titulo} — {ROTULOS_ESTORNO[estorno].apoio}</p>
          </BlocoRevisao>
        </div>
      ),
    },
  ]

  /** Erro que impede sair de cada passo — o schema já apontou onde. */
  function passoValido(indice: number): boolean {
    setTentouSeguir(true)
    if (indice === 0) return Object.keys(errosFaixas).length === 0
    if (indice === 1) return !erroFechamento && !erroPagamento
    return true
  }

  return (
    <Passos
      passos={PASSOS}
      passo={passoAtual}
      onPasso={setPassoAtual}
      rotuloFinal="Salvar regras"
      ocupado={salvando}
      podeAvancar={passoValido}
      aoConcluir={salvar}
    />
  )
}
