import { describe, it, expect } from 'vitest'
import { formatBRL, formatData, parseBRLParaCentavos } from './format'

describe('format', () => {
  it('formatBRL', () => expect(formatBRL(123456)).toMatch(/R\$\s?1\.234,56/))
  it('formatData', () => expect(formatData('2026-08-10')).toBe('10/08/2026'))
  it('parseBRLParaCentavos', () => {
    expect(parseBRLParaCentavos('500.000,00')).toBe(50_000_000)
    expect(parseBRLParaCentavos('R$ 1.234,56')).toBe(123_456)
  })
})
