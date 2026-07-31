import { describe, it, expect } from 'vitest'
import { configFinanceiraSchema, vendaFormSchema } from './schemas'

const faixasValidas = [
  { min: 0, max: 100_000_000, percentual: 0.5, parcelas: 2 },
  { min: 100_000_001, max: null, percentual: 0.6, parcelas: 3 },
]
const base = {
  nomePolitica: 'Padrão', faixas: faixasValidas,
  diaFechamento: 25, diaPrimeiroPagamento: 10, regrasEstorno: '',
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
  it('rejeita parcelas = 0 (RN-010)', () => {
    const faixas = [{ min: 0, max: null, percentual: 0.5, parcelas: 0 }]
    expect(configFinanceiraSchema.safeParse({ ...base, faixas }).success).toBe(false)
  })
  it('rejeita dia de fechamento fora de 1-31', () => {
    expect(configFinanceiraSchema.safeParse({ ...base, diaFechamento: 32 }).success).toBe(false)
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
