import { describe, it, expect } from 'vitest'
import { calcularCompetencia } from './calculo'
import type { ConfigCalc } from '@/lib/domain/types'

const config: ConfigCalc = {
  faixas: [
    { min: 0, max: 100_000_000, percentual: 0.5, parcelas: 2 },          // até R$ 1M
    { min: 100_000_001, max: 160_000_000, percentual: 0.6, parcelas: 3 }, // até R$ 1,6M
    { min: 160_000_001, max: null, percentual: 0.7, parcelas: 3 },
  ],
  calendario: { diaFechamento: 25, diaPrimeiroPagamento: 10 },
}
const comp = { ano: 2026, mes: 7 }
// antes de qualquer parcela vencer: quem já caiu vem só do status gravado
const HOJE = '2026-08-01'
const venda = (id: string, valor: number, status = 'confirmada' as const) =>
  ({ id, valorCartaCentavos: valor, status })

describe('calcularCompetencia — faixa por acumulado retroativo', () => {
  it('uma venda de R$ 500k → faixa 1 (0,5%, 2x)', () => {
    const r = calcularCompetencia({ config, competencia: comp,
      vendas: [venda('v1', 50_000_000)], recebimentosExistentes: [], hoje: HOJE })
    expect(r.comissoes).toHaveLength(1)
    expect(r.comissoes[0]).toMatchObject({ vendaId: 'v1', percentual: 0.5,
      valorCentavos: 250_000, nParcelas: 2, status: 'prevista' })
    expect(r.recebimentosPrevistos).toEqual([
      { vendaId: 'v1', numeroParcela: 1, valorCentavos: 125_000, dataPrevista: '2026-08-10', status: 'previsto' },
      { vendaId: 'v1', numeroParcela: 2, valorCentavos: 125_000, dataPrevista: '2026-09-10', status: 'previsto' },
    ])
  })

  it('segunda venda cruza faixa → TODAS as vendas recalculam para 0,6% (retroativo)', () => {
    const r = calcularCompetencia({ config, competencia: comp,
      vendas: [venda('v1', 80_000_000), venda('v2', 40_000_000)], // total R$ 1,2M
      recebimentosExistentes: [], hoje: HOJE })
    expect(r.comissoes.map(c => c.percentual)).toEqual([0.6, 0.6])
    expect(r.comissoes[0].valorCentavos).toBe(480_000) // 800k * 0.6%
    expect(r.comissoes[0].nParcelas).toBe(3)
  })

  /*
   * O formulário pede o PISO de cada faixa e deriva o teto da anterior como
   * "piso menos um centavo". Quem escreve a política como "atingiu R$ 1,6M,
   * vira 0,7%" digita 1.600.000,00 no piso da faixa 3 — e o mês que fecha
   * exatamente nesse valor tem que cair nela, não na de baixo.
   */
  it('acumulado exatamente no piso da faixa entra na faixa de cima', () => {
    const cfg: ConfigCalc = {
      ...config,
      faixas: [
        { min: 0, max: 159_999_999, percentual: 0.6, parcelas: 3 },
        { min: 160_000_000, max: null, percentual: 0.7, parcelas: 3 },
      ],
    }
    const naVirada = calcularCompetencia({ config: cfg, competencia: comp,
      vendas: [venda('v1', 160_000_000)], recebimentosExistentes: [], hoje: HOJE })
    expect(naVirada.comissoes[0].percentual).toBe(0.7)

    const umCentavoAntes = calcularCompetencia({ config: cfg, competencia: comp,
      vendas: [venda('v1', 159_999_999)], recebimentosExistentes: [], hoje: HOJE })
    expect(umCentavoAntes.comissoes[0].percentual).toBe(0.6)
  })

  it('resto de centavos vai para a última parcela', () => {
    // comissão 0,5% de R$ 200,02 = 100.01 → mas melhor: valor que gera resto
    // 3 parcelas de comissão 100 centavos: 33+33+34
    const cfg: ConfigCalc = { ...config,
      faixas: [{ min: 0, max: null, percentual: 0.5, parcelas: 3 }] }
    const r = calcularCompetencia({ config: cfg, competencia: comp,
      vendas: [venda('v1', 20_000)], recebimentosExistentes: [], hoje: HOJE }) // comissão = 100
    expect(r.recebimentosPrevistos.map(p => p.valorCentavos)).toEqual([33, 33, 34])
  })

  it('parcelas recebidas são intocáveis; restante redistribui nas não recebidas', () => {
    // v1 800k sozinha: comissão 0,5% = 400_000, 2x de 200_000; parcela 1 já recebida
    // entra v2 400k → total 1,2M → 0,6%: v1 = 480_000 em 3x
    // recebido: 200_000 → restante 280_000 em parcelas 2..3 → 140_000 cada
    const r = calcularCompetencia({ config, competencia: comp,
      vendas: [venda('v1', 80_000_000), venda('v2', 40_000_000)],
      recebimentosExistentes: [
        { id: 'r1', vendaId: 'v1', numeroParcela: 1, valorCentavos: 200_000, status: 'recebido', dataPrevista: '2026-08-10' },
      ], hoje: HOJE })
    const v1prev = r.recebimentosPrevistos.filter(p => p.vendaId === 'v1')
    expect(v1prev).toEqual([
      { vendaId: 'v1', numeroParcela: 2, valorCentavos: 140_000, dataPrevista: '2026-09-10', status: 'previsto' },
      { vendaId: 'v1', numeroParcela: 3, valorCentavos: 140_000, dataPrevista: '2026-10-10', status: 'previsto' },
    ])
    const c1 = r.comissoes.find(c => c.vendaId === 'v1')!
    expect(c1.status).toBe('parcial')
  })

  it('venda cancelada: sem previstos, comissão cancelada, não conta no volume', () => {
    const r = calcularCompetencia({ config, competencia: comp,
      vendas: [venda('v1', 80_000_000), venda('v2', 40_000_000, 'confirmada'),],
      recebimentosExistentes: [], hoje: HOJE })
    const r2 = calcularCompetencia({ config, competencia: comp,
      vendas: [{ ...venda('v1', 80_000_000), status: 'cancelada' }, venda('v2', 40_000_000)],
      recebimentosExistentes: [], hoje: HOJE })
    // com cancelamento, volume cai para 400k → faixa 1
    const c2 = r2.comissoes.find(c => c.vendaId === 'v2')!
    expect(c2.percentual).toBe(0.5)
    const c1 = r2.comissoes.find(c => c.vendaId === 'v1')!
    expect(c1.status).toBe('cancelada')
    expect(r2.recebimentosPrevistos.filter(p => p.vendaId === 'v1')).toHaveLength(0)
    expect(r.comissoes.find(c => c.vendaId === 'v2')!.percentual).toBe(0.6)
  })

  it('venda estornada sai do volume e tira a faixa das outras', () => {
    // desistência do cliente: a venda deixa de contar para o total do mês,
    // então quem ficou pode cair de faixa
    const r = calcularCompetencia({ config, competencia: comp,
      vendas: [{ ...venda('v1', 80_000_000), status: 'estornada' }, venda('v2', 40_000_000)],
      recebimentosExistentes: [], hoje: HOJE })
    const c1 = r.comissoes.find(c => c.vendaId === 'v1')!
    expect(c1.status).toBe('estornada')
    expect(r.recebimentosPrevistos.filter(p => p.vendaId === 'v1')).toHaveLength(0)
    expect(r.comissoes.find(c => c.vendaId === 'v2')!.percentual).toBe(0.5)
  })

  it('parcela estornada não conta como dinheiro que entrou', () => {
    // o escritório descontou de volta: a comissão volta a ser devida por
    // inteiro, e não pode ficar marcada como recebida
    const cfg: ConfigCalc = { ...config,
      faixas: [{ min: 0, max: null, percentual: 0.5, parcelas: 2 }] }
    const r = calcularCompetencia({ config: cfg, competencia: comp,
      vendas: [venda('v1', 20_000_000)], // comissão 100.000
      recebimentosExistentes: [
        { id: 'r1', vendaId: 'v1', numeroParcela: 1, valorCentavos: 50_000, status: 'estornado', dataPrevista: '2026-08-10' },
      ], hoje: HOJE })
    expect(r.comissoes[0].status).toBe('prevista')
    expect(r.recebimentosPrevistos.reduce((s, p) => s + p.valorCentavos, 0)).toBe(100_000)
  })

  it('parcela cuja data já chegou vale como paga, sem ninguém confirmar', () => {
    // o escritório paga no dia combinado: passado o dia 10/08, a primeira
    // parcela conta como dinheiro que entrou mesmo sem marcação manual
    const r = calcularCompetencia({ config, competencia: comp,
      vendas: [venda('v1', 80_000_000), venda('v2', 40_000_000)],
      recebimentosExistentes: [
        { id: 'r1', vendaId: 'v1', numeroParcela: 1, valorCentavos: 200_000, status: 'previsto', dataPrevista: '2026-08-10' },
      ],
      hoje: '2026-08-15' })
    const c1 = r.comissoes.find(c => c.vendaId === 'v1')!
    expect(c1.status).toBe('parcial')
    // a parcela que já caiu não é reescrita; o resto se redistribui nas futuras
    expect(r.recebimentosPrevistos.filter(p => p.vendaId === 'v1').map(p => p.numeroParcela))
      .toEqual([2, 3])
  })

  it('parcela futura continua aberta a recálculo', () => {
    const r = calcularCompetencia({ config, competencia: comp,
      vendas: [venda('v1', 80_000_000)],
      recebimentosExistentes: [
        { id: 'r1', vendaId: 'v1', numeroParcela: 1, valorCentavos: 200_000, status: 'previsto', dataPrevista: '2026-08-10' },
      ],
      hoje: '2026-08-01' })
    expect(r.comissoes[0].status).toBe('prevista')
    expect(r.recebimentosPrevistos.map(p => p.numeroParcela)).toEqual([1, 2])
  })

  it('todas as parcelas recebidas → comissão recebida', () => {
    const cfg: ConfigCalc = { ...config,
      faixas: [{ min: 0, max: null, percentual: 0.5, parcelas: 1 }] }
    const r = calcularCompetencia({ config: cfg, competencia: comp,
      vendas: [venda('v1', 20_000)],
      recebimentosExistentes: [
        { id: 'r1', vendaId: 'v1', numeroParcela: 1, valorCentavos: 100, status: 'recebido', dataPrevista: '2026-08-10' },
      ], hoje: HOJE })
    expect(r.comissoes[0].status).toBe('recebida')
    expect(r.recebimentosPrevistos).toHaveLength(0)
  })
})
