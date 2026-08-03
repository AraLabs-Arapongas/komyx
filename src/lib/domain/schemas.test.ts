import { describe, it, expect } from 'vitest'
import { configFinanceiraSchema, vendaFormSchema } from './schemas'

const faixasValidas = [
  { min: 0, max: 100_000_000, percentual: 0.5, parcelas: 2 },
  { min: 100_000_001, max: null, percentual: 0.6, parcelas: 3 },
]
const base = {
  nomePolitica: 'Padrão', faixas: faixasValidas,
  diaFechamento: 25, diaPrimeiroPagamento: 10, politicaEstorno: 'perguntar' as const,
}

describe('configFinanceiraSchema', () => {
  it('aceita config válida', () => {
    expect(configFinanceiraSchema.safeParse(base).success).toBe(true)
  })
  it('rejeita zero faixas', () => {
    expect(configFinanceiraSchema.safeParse({ ...base, faixas: [] }).success).toBe(false)
  })
  it('rejeita faixas sobrepostas (RN-007)', () => {
    const faixas = [
      { min: 0, max: 100_000_000, percentual: 0.5, parcelas: 2 },
      { min: 80_000_000, max: null, percentual: 0.6, parcelas: 3 },
    ]
    expect(configFinanceiraSchema.safeParse({ ...base, faixas }).success).toBe(false)
  })
  it('rejeita buraco entre faixas', () => {
    const faixas = [
      { min: 0, max: 100_000_000, percentual: 0.5, parcelas: 2 },
      { min: 200_000_000, max: null, percentual: 0.6, parcelas: 3 },
    ]
    expect(configFinanceiraSchema.safeParse({ ...base, faixas }).success).toBe(false)
  })
  it('rejeita primeira faixa que não começa em 0', () => {
    const faixas = [{ min: 100, max: null, percentual: 0.5, parcelas: 2 }]
    expect(configFinanceiraSchema.safeParse({ ...base, faixas }).success).toBe(false)
  })
  it('rejeita percentual <= 0 (RN-009)', () => {
    const faixas = [{ min: 0, max: null, percentual: 0, parcelas: 2 }]
    expect(configFinanceiraSchema.safeParse({ ...base, faixas }).success).toBe(false)
  })
  it('rejeita percentual acima de 100%', () => {
    const faixas = [{ min: 0, max: null, percentual: 3213131231, parcelas: 2 }]
    expect(configFinanceiraSchema.safeParse({ ...base, faixas }).success).toBe(false)
  })
  it('rejeita parcelas = 0 (RN-010)', () => {
    const faixas = [{ min: 0, max: null, percentual: 0.5, parcelas: 0 }]
    expect(configFinanceiraSchema.safeParse({ ...base, faixas }).success).toBe(false)
  })
  it('rejeita dia de fechamento fora de 1-31', () => {
    expect(configFinanceiraSchema.safeParse({ ...base, diaFechamento: 32 }).success).toBe(false)
  })

  /*
   * A distribuição é escrita em pontos da carta e soma a comissão da faixa,
   * porque é assim que o escritório enuncia a regra: "3% em três vezes, 1%
   * por mês". A unidade antiga somava 100 e agora é justamente o que a
   * validação precisa recusar — senão uma política de 3% aceitaria fatias que
   * prometem 100% da carta.
   */
  describe('distribuição das parcelas', () => {
    const comDist = (percentual: number, distribuicao: number[], parcelas: number) => ({
      ...base,
      faixas: [{ min: 0, max: null, percentual, parcelas, distribuicao }],
    })

    it('aceita fatias que somam a comissão da faixa', () => {
      expect(configFinanceiraSchema.safeParse(comDist(3, [1, 1, 1], 3)).success).toBe(true)
      expect(configFinanceiraSchema.safeParse(comDist(3, [0.5, 1, 1.5], 3)).success).toBe(true)
    })
    it('rejeita a unidade antiga, que somava 100', () => {
      expect(configFinanceiraSchema.safeParse(comDist(3, [33.33, 33.33, 33.34], 3)).success).toBe(false)
    })
    it('rejeita soma diferente da comissão', () => {
      expect(configFinanceiraSchema.safeParse(comDist(3, [1, 1, 0.5], 3)).success).toBe(false)
    })
    it('rejeita quantidade de fatias diferente do número de parcelas', () => {
      expect(configFinanceiraSchema.safeParse(comDist(3, [1.5, 1.5], 3)).success).toBe(false)
    })
    it('aceita centavos de percentual, com o resto na última', () => {
      // 0,5% em três não divide em duas casas: 0,17 + 0,17 + 0,16
      expect(configFinanceiraSchema.safeParse(comDist(0.5, [0.17, 0.17, 0.16], 3)).success).toBe(true)
    })
  })
})

describe('vendaFormSchema', () => {
  const venda = {
    clienteId: 'b3b8c0e2-0000-4000-8000-000000000000',
    valorCartaCentavos: 50_000_000, administradora: 'Porto',
    grupo: '1234', cota: '567', dataVenda: '2026-07-12', observacoes: '',
  }
  it('aceita venda válida', () => {
    expect(vendaFormSchema.safeParse(venda).success).toBe(true)
  })
  it('rejeita valor <= 0', () => {
    expect(vendaFormSchema.safeParse({ ...venda, valorCartaCentavos: 0 }).success).toBe(false)
  })
  it('rejeita data inválida', () => {
    expect(vendaFormSchema.safeParse({ ...venda, dataVenda: '12/07/2026' }).success).toBe(false)
  })
})
