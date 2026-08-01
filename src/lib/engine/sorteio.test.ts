import { describe, it, expect } from 'vitest'
import { conferirCota, normalizarCota } from './sorteio'

// extração 6087, de 29/07/2026
const BILHETES = ['084621', '021500', '062794', '072546', '068807']

describe('normalizarCota', () => {
  it('fica só com os dígitos', () => {
    expect(normalizarCota('C 145')).toBe('145')
    expect(normalizarCota('145-A')).toBe('145')
  })

  it('descarta zeros à esquerda', () => {
    expect(normalizarCota('0077')).toBe('77')
  })

  it('devolve null quando não sobra número', () => {
    expect(normalizarCota('')).toBeNull()
    expect(normalizarCota('cota')).toBeNull()
    expect(normalizarCota('000')).toBeNull()
  })
})

describe('conferirCota', () => {
  it('acerta pelos últimos dígitos, lendo o tamanho da cota', () => {
    // 084621 termina em 621
    const acertos = conferirCota('621', BILHETES)
    expect(acertos).toHaveLength(1)
    expect(acertos[0]).toEqual({ premio: 1, bilhete: '084621', final: '621' })
  })

  it('confere todos os cinco prêmios, não só o primeiro', () => {
    // 068807 é o 5º prêmio
    expect(conferirCota('807', BILHETES)).toEqual([
      { premio: 5, bilhete: '068807', final: '807' },
    ])
  })

  it('lê menos dígitos quando a cota é menor', () => {
    // 021500 termina em 00 → cota 0 não existe, mas cota 500 sim
    expect(conferirCota('500', BILHETES)).toEqual([
      { premio: 2, bilhete: '021500', final: '500' },
    ])
  })

  it('lê pelo tamanho da cota já sem os zeros à esquerda', () => {
    // "07" vira "7": um dígito, então compara com o último do bilhete
    expect(conferirCota('07', BILHETES)).toEqual([
      { premio: 5, bilhete: '068807', final: '7' },
    ])
  })

  it('pode acertar mais de um prêmio', () => {
    // 084621 e 072546 terminam em 1 e 6 — nenhum acerta o 4;
    // já 021500 e 062794 terminam em 0 e 4
    const acertos = conferirCota('4', BILHETES)
    expect(acertos.map(a => a.premio)).toEqual([3])
  })

  it('não acerta nada quando a cota não bate', () => {
    expect(conferirCota('999', BILHETES)).toEqual([])
  })

  it('ignora cota vazia ou sem dígitos', () => {
    expect(conferirCota('', BILHETES)).toEqual([])
    expect(conferirCota('sem número', BILHETES)).toEqual([])
  })

  it('ignora cota maior que o bilhete: seis dígitos é o teto', () => {
    expect(conferirCota('1084621', BILHETES)).toEqual([])
  })

  it('aceita o bilhete inteiro como cota', () => {
    expect(conferirCota('84621', BILHETES)).toEqual([
      { premio: 1, bilhete: '084621', final: '84621' },
    ])
  })

  it('não quebra sem bilhetes', () => {
    expect(conferirCota('621', [])).toEqual([])
  })
})
