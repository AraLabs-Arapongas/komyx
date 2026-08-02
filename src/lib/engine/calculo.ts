import type { ConfigCalc, CompetenciaRef, Faixa, VendaStatus, RecebimentoStatus, ComissaoStatus } from '@/lib/domain/types'
import { dataParcela } from './calendario'

export type VendaCalc = { id: string; valorCartaCentavos: number; status: VendaStatus }
export type RecebimentoExistente = {
  id: string; vendaId: string; numeroParcela: number
  valorCentavos: number; status: RecebimentoStatus; dataPrevista: string
}

/**
 * O escritório paga no dia combinado, então a parcela vale como paga quando
 * essa data chega — o corretor não precisa confirmar nada. O status gravado
 * ainda conta, para não desfazer o que já foi marcado à mão no passado.
 */
function jaCaiu(r: RecebimentoExistente, hoje: string): boolean {
  if (r.status === 'cancelado' || r.status === 'estornado') return false
  return r.status === 'recebido' || r.dataPrevista <= hoje
}
export type ComissaoResultado = {
  vendaId: string; percentual: number; faixaAplicada: Faixa
  valorCentavos: number; nParcelas: number; status: ComissaoStatus
}
export type RecebimentoResultado = {
  vendaId: string; numeroParcela: number
  valorCentavos: number; dataPrevista: string; status: 'previsto'
}
export type ResultadoCalculo = {
  comissoes: ComissaoResultado[]
  recebimentosPrevistos: RecebimentoResultado[]
}

function localizarFaixa(faixas: Faixa[], volume: number): Faixa {
  const ordenadas = [...faixas].sort((a, b) => a.min - b.min)
  const f = ordenadas.find(f => volume >= f.min && (f.max === null || volume <= f.max))
  return f ?? ordenadas[ordenadas.length - 1]
}

/**
 * Divide o que falta receber entre as parcelas que ainda não caíram.
 *
 * Sem `distribuicao`, divide igual. Com ela, cada parcela leva a fatia que a
 * política do escritório manda — [40, 40, 20] não é o mesmo que três iguais, e
 * supor que fosse mostrava na agenda uma data com valor que não era o dela.
 *
 * O resto da divisão vai sempre para a ÚLTIMA parcela pendente: centavo que
 * sobra tem que cair em algum lugar, e cair no fim é o que mantém a soma das
 * parcelas idêntica à comissão. Quando parte já foi recebida, as fatias das
 * parcelas que restam são renormalizadas entre si — senão o que sobra a receber
 * não fecharia com o total.
 */
function repartir(restante: number, pendentes: number[], faixa: Faixa): number[] {
  const dist = faixa.distribuicao
  const usarDistribuicao = Array.isArray(dist)
    && dist.length === faixa.parcelas
    && dist.every(p => typeof p === 'number' && p >= 0)

  const pesos = usarDistribuicao
    ? pendentes.map(n => dist![n - 1] ?? 0)
    : pendentes.map(() => 1)
  const somaPesos = pesos.reduce((s, p) => s + p, 0)
  // peso zerado (ou distribuição inválida) volta para a divisão igual: melhor
  // repartir do que devolver parcelas de zero e "perder" dinheiro na tela
  if (somaPesos <= 0) return repartirIgual(restante, pendentes.length)

  const valores = pesos.map(p => Math.floor(restante * p / somaPesos))
  const distribuido = valores.reduce((s, v) => s + v, 0)
  valores[valores.length - 1] += restante - distribuido
  return valores
}

function repartirIgual(restante: number, quantas: number): number[] {
  const base = Math.floor(restante / quantas)
  const valores = Array.from({ length: quantas }, () => base)
  valores[quantas - 1] = restante - base * (quantas - 1)
  return valores
}

export function calcularCompetencia(input: {
  config: ConfigCalc
  competencia: CompetenciaRef
  vendas: VendaCalc[]
  recebimentosExistentes: RecebimentoExistente[]
  /** data de hoje (YYYY-MM-DD) — define quais parcelas já caíram */
  hoje: string
}): ResultadoCalculo {
  const { config, competencia, vendas, recebimentosExistentes, hoje } = input
  const confirmadas = vendas.filter(v => v.status === 'confirmada')
  const volume = confirmadas.reduce((s, v) => s + v.valorCartaCentavos, 0)
  const faixa = localizarFaixa(config.faixas, volume)

  const comissoes: ComissaoResultado[] = []
  const recebimentosPrevistos: RecebimentoResultado[] = []

  for (const venda of vendas) {
    if (venda.status === 'cancelada' || venda.status === 'estornada') {
      comissoes.push({
        vendaId: venda.id, percentual: faixa.percentual, faixaAplicada: faixa,
        valorCentavos: Math.round(venda.valorCartaCentavos * faixa.percentual / 100),
        nParcelas: faixa.parcelas,
        status: venda.status === 'cancelada' ? 'cancelada' : 'estornada',
      })
      continue
    }
    if (venda.status !== 'confirmada') continue

    const valorComissao = Math.round(venda.valorCartaCentavos * faixa.percentual / 100)
    const recebidos = recebimentosExistentes.filter(
      r => r.vendaId === venda.id && jaCaiu(r, hoje))
    const totalRecebido = recebidos.reduce((s, r) => s + r.valorCentavos, 0)
    const parcelasRecebidas = new Set(recebidos.map(r => r.numeroParcela))

    const numerosPendentes: number[] = []
    for (let n = 1; n <= faixa.parcelas; n++)
      if (!parcelasRecebidas.has(n)) numerosPendentes.push(n)

    const restante = Math.max(0, valorComissao - totalRecebido)
    if (numerosPendentes.length > 0 && restante > 0) {
      const valores = repartir(restante, numerosPendentes, faixa)
      numerosPendentes.forEach((n, i) => {
        recebimentosPrevistos.push({
          vendaId: venda.id, numeroParcela: n,
          valorCentavos: valores[i],
          dataPrevista: dataParcela(competencia, config.calendario.diaPrimeiroPagamento, n),
          status: 'previsto',
        })
      })
    }

    const status: ComissaoStatus =
      totalRecebido === 0 ? 'prevista'
      : restante === 0 || numerosPendentes.length === 0 ? 'recebida'
      : 'parcial'

    comissoes.push({
      vendaId: venda.id, percentual: faixa.percentual, faixaAplicada: faixa,
      valorCentavos: valorComissao, nParcelas: faixa.parcelas, status,
    })
  }

  return { comissoes, recebimentosPrevistos }
}
