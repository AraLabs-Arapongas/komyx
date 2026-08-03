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

  describe('distribuição desigual entre as parcelas', () => {
    const cfg = (distribuicao: number[] | null): ConfigCalc => ({
      ...config,
      faixas: [{ min: 0, max: null, percentual: 1, parcelas: 3, distribuicao }],
    })

    it('40/40/20 paga cada parcela conforme a política, não em três iguais', () => {
      // comissão 1% de R$ 10.000 = R$ 100,00
      const r = calcularCompetencia({ config: cfg([40, 40, 20]), competencia: comp,
        vendas: [venda('v1', 1_000_000)], recebimentosExistentes: [], hoje: HOJE })
      expect(r.comissoes[0].valorCentavos).toBe(10_000)
      expect(r.recebimentosPrevistos.map(p => p.valorCentavos)).toEqual([4_000, 4_000, 2_000])
    })

    it('o que a divisão não fecha sobra na última parcela, nunca some', () => {
      // 1% de R$ 100,01 = 100 centavos; 33/33/34 em vez de 33/33/33
      const r = calcularCompetencia({ config: cfg([33.33, 33.33, 33.34]), competencia: comp,
        vendas: [venda('v1', 10_001)], recebimentosExistentes: [], hoje: HOJE })
      const total = r.recebimentosPrevistos.reduce((s, p) => s + p.valorCentavos, 0)
      expect(total).toBe(r.comissoes[0].valorCentavos)
    })

    it('sem distribuição, continua dividindo igual', () => {
      const r = calcularCompetencia({ config: cfg(null), competencia: comp,
        vendas: [venda('v1', 900_000)], recebimentosExistentes: [], hoje: HOJE })
      expect(r.recebimentosPrevistos.map(p => p.valorCentavos)).toEqual([3_000, 3_000, 3_000])
    })

    it('parcela já recebida não é reescrita; o resto respeita a distribuição', () => {
      // 40/40/20 de R$ 100,00: 40 + 40 + 20. A primeira já caiu.
      const r = calcularCompetencia({ config: cfg([40, 40, 20]), competencia: comp,
        vendas: [venda('v1', 1_000_000)],
        recebimentosExistentes: [
          { id: 'r1', vendaId: 'v1', numeroParcela: 1, valorCentavos: 4_000, status: 'recebido', dataPrevista: '2026-08-10' },
        ], hoje: HOJE })
      expect(r.recebimentosPrevistos.map(p => ({ n: p.numeroParcela, v: p.valorCentavos })))
        .toEqual([{ n: 2, v: 4_000 }, { n: 3, v: 2_000 }])
    })
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

describe('faixa pelo acumulado do escritório (volumeExterno)', () => {
  // duas faixas: até 100 mil paga 1%, acima paga 2%
  const config: ConfigCalc = {
    faixas: [
      { min: 0, max: 10_000_000, percentual: 1, parcelas: 1 },
      { min: 10_000_001, max: null, percentual: 2, parcelas: 1 },
    ],
    calendario: { diaFechamento: 25, diaPrimeiroPagamento: 10 },
  }
  const base = {
    config,
    competencia: { ano: 2026, mes: 8 },
    recebimentosExistentes: [],
    hoje: '2026-08-02',
  }
  const venda = { id: 'v1', valorCartaCentavos: 5_000_000, status: 'confirmada' as const }

  it('sozinho, o volume próprio decide a faixa', () => {
    const r = calcularCompetencia({ ...base, vendas: [venda] })
    // 50 mil, primeira faixa: 1% de 50 mil
    expect(r.comissoes[0].valorCentavos).toBe(50_000)
  })

  it('o volume da equipe empurra a faixa, mas a comissão continua sobre a própria carta', () => {
    const r = calcularCompetencia({ ...base, vendas: [venda], volumeExterno: 20_000_000 })
    // 50 mil próprios + 200 mil da equipe = segunda faixa: 2% dos MEUS 50 mil
    expect(r.comissoes[0].percentual).toBe(2)
    expect(r.comissoes[0].valorCentavos).toBe(100_000)
  })

  it('volume externo zerado é o comportamento de sempre', () => {
    const com = calcularCompetencia({ ...base, vendas: [venda], volumeExterno: 0 })
    const sem = calcularCompetencia({ ...base, vendas: [venda] })
    expect(com).toEqual(sem)
  })

  it('mês sem venda própria não gera comissão, por maior que seja o volume da equipe', () => {
    const r = calcularCompetencia({ ...base, vendas: [], volumeExterno: 99_000_000 })
    expect(r.comissoes).toHaveLength(0)
    expect(r.recebimentosPrevistos).toHaveLength(0)
  })
})
