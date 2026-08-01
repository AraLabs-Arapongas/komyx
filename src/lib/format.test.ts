import { describe, it, expect } from 'vitest'
import {
  formatBRL, formatData, parseBRLParaCentavos, formatPercentual,
  mascaraValor, mascaraData, mascaraPercentual, mascaraInteiro,
  dataBRParaISO, formatDataExtenso, formatMesAno,
} from './format'

describe('format', () => {
  it('formatBRL', () => expect(formatBRL(123456)).toMatch(/R\$\s?1\.234,56/))
  it('formatData', () => expect(formatData('2026-08-10')).toBe('10/08/2026'))
  it('parseBRLParaCentavos', () => {
    expect(parseBRLParaCentavos('500.000,00')).toBe(50_000_000)
    expect(parseBRLParaCentavos('R$ 1.234,56')).toBe(123_456)
  })
  it('formatPercentual', () => expect(formatPercentual(0.5)).toBe('0,5%'))
})

describe('mascaraValor', () => {
  it('formata conforme o usuário digita, dos centavos para a esquerda', () => {
    expect(mascaraValor('5')).toBe('0,05')
    expect(mascaraValor('50')).toBe('0,50')
    expect(mascaraValor('500')).toBe('5,00')
    expect(mascaraValor('50000')).toBe('500,00')
    expect(mascaraValor('50000000')).toBe('500.000,00')
  })
  it('ignora qualquer caractere que não seja dígito', () => {
    expect(mascaraValor('R$ 1.234,56')).toBe('1.234,56')
    expect(mascaraValor('abc')).toBe('')
  })
  it('campo vazio continua vazio', () => expect(mascaraValor('')).toBe(''))
  it('ida e volta com parseBRLParaCentavos preserva o valor', () => {
    expect(parseBRLParaCentavos(mascaraValor('50000000'))).toBe(50_000_000)
    expect(parseBRLParaCentavos(mascaraValor('123456'))).toBe(123_456)
  })
})

describe('mascaraData', () => {
  it('insere as barras enquanto digita', () => {
    expect(mascaraData('1')).toBe('1')
    expect(mascaraData('10')).toBe('10')
    expect(mascaraData('1008')).toBe('10/08')
    expect(mascaraData('10082026')).toBe('10/08/2026')
  })
  it('descarta dígitos além da data completa', () => {
    expect(mascaraData('100820269999')).toBe('10/08/2026')
  })
  it('aceita texto já mascarado sem duplicar barras', () => {
    expect(mascaraData('10/08/2026')).toBe('10/08/2026')
  })
})

describe('dataBRParaISO', () => {
  it('converte data completa', () => expect(dataBRParaISO('10/08/2026')).toBe('2026-08-10'))
  it('retorna vazio para data incompleta ou inválida', () => {
    expect(dataBRParaISO('10/08')).toBe('')
    expect(dataBRParaISO('32/08/2026')).toBe('')
    expect(dataBRParaISO('10/13/2026')).toBe('')
    expect(dataBRParaISO('')).toBe('')
  })
  it('rejeita dia que não existe no mês', () => {
    expect(dataBRParaISO('31/02/2026')).toBe('')
    expect(dataBRParaISO('29/02/2026')).toBe('')
    expect(dataBRParaISO('29/02/2028')).toBe('2028-02-29')
  })
  it('ida e volta com formatData', () => {
    expect(dataBRParaISO(formatData('2026-08-10'))).toBe('2026-08-10')
  })
})

describe('mascaraPercentual e mascaraInteiro', () => {
  it('percentual aceita uma vírgula decimal', () => {
    expect(mascaraPercentual('0,5')).toBe('0,5')
    expect(mascaraPercentual('0.5')).toBe('0,5')
    expect(mascaraPercentual('0,5,5')).toBe('0,55')
    expect(mascaraPercentual('abc1')).toBe('1')
  })
  it('inteiro mantém apenas dígitos', () => {
    expect(mascaraInteiro('12a3')).toBe('123')
    expect(mascaraInteiro('')).toBe('')
  })
})

describe('rótulos de data', () => {
  it('formatDataExtenso', () => expect(formatDataExtenso('2026-08-10')).toBe('10 de agosto'))
  it('formatDataExtenso com ano', () =>
    expect(formatDataExtenso('2026-08-10', true)).toBe('10 de agosto de 2026'))
  it('formatMesAno', () => expect(formatMesAno(2026, 8)).toBe('Agosto de 2026'))
})
