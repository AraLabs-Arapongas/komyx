import { describe, it, expect } from 'vitest'
import { competenciaDaVenda, dataParcela, proximaCompetencia, compararCompetencias } from './calendario'

describe('competenciaDaVenda (fechamento dia 25)', () => {
  it('venda em 12/07 → competência julho (PRD)', () => {
    expect(competenciaDaVenda('2026-07-12', 25)).toEqual({ ano: 2026, mes: 7 })
  })
  it('venda em 25/07 (dia do fechamento, inclusivo) → julho', () => {
    expect(competenciaDaVenda('2026-07-25', 25)).toEqual({ ano: 2026, mes: 7 })
  })
  it('venda em 28/07 → agosto (PRD)', () => {
    expect(competenciaDaVenda('2026-07-28', 25)).toEqual({ ano: 2026, mes: 8 })
  })
  it('venda em 28/12 → janeiro do ano seguinte', () => {
    expect(competenciaDaVenda('2026-12-28', 25)).toEqual({ ano: 2027, mes: 1 })
  })
})

describe('dataParcela (pagamento dia 10)', () => {
  it('competência julho, parcela 1 → 10/08 (PRD)', () => {
    expect(dataParcela({ ano: 2026, mes: 7 }, 10, 1)).toBe('2026-08-10')
  })
  it('parcela 3 → 10/10', () => {
    expect(dataParcela({ ano: 2026, mes: 7 }, 10, 3)).toBe('2026-10-10')
  })
  it('vira o ano: competência novembro, parcela 2 → 10/01', () => {
    expect(dataParcela({ ano: 2026, mes: 11 }, 10, 2)).toBe('2027-01-10')
  })
  it('clampa dia 31 em mês curto: competência janeiro, dia 31, parcela 1 → 28/02', () => {
    expect(dataParcela({ ano: 2026, mes: 1 }, 31, 1)).toBe('2026-02-28')
  })
})

describe('helpers de competência', () => {
  it('proximaCompetencia vira ano', () => {
    expect(proximaCompetencia({ ano: 2026, mes: 12 })).toEqual({ ano: 2027, mes: 1 })
  })
  it('compararCompetencias ordena', () => {
    expect(compararCompetencias({ ano: 2026, mes: 7 }, { ano: 2026, mes: 8 })).toBeLessThan(0)
    expect(compararCompetencias({ ano: 2026, mes: 7 }, { ano: 2026, mes: 7 })).toBe(0)
  })
})
