import { describe, it, expect } from 'vitest'
import { avaliarAcesso, deveAvisarDoTeste, temAvisoDeAssinatura, type EstadoAssinatura } from './acesso'

const AGORA = new Date('2026-08-01T12:00:00Z')

function estado(p: Partial<EstadoAssinatura>): EstadoAssinatura {
  return { trial_termina_em: null, assinatura_status: null, assinatura_ate: null, ...p }
}

describe('avaliarAcesso', () => {
  it('libera quem está no teste e conta os dias que faltam', () => {
    const a = avaliarAcesso(estado({ trial_termina_em: '2026-08-08T12:00:00Z' }), AGORA)
    expect(a).toEqual({ liberado: true, motivo: 'teste', diasRestantes: 7 })
  })

  it('arredonda o último dia para cima, não para zero', () => {
    const a = avaliarAcesso(estado({ trial_termina_em: '2026-08-01T12:30:00Z' }), AGORA)
    expect(a).toEqual({ liberado: true, motivo: 'teste', diasRestantes: 1 })
  })

  it('fecha quando o teste venceu', () => {
    const a = avaliarAcesso(estado({ trial_termina_em: '2026-07-31T12:00:00Z' }), AGORA)
    expect(a).toEqual({ liberado: false, motivo: 'teste_acabou' })
  })

  it('libera assinatura ativa mesmo com o teste vencido', () => {
    const a = avaliarAcesso(estado({
      trial_termina_em: '2026-07-01T12:00:00Z',
      assinatura_status: 'active',
      assinatura_ate: '2026-09-01T12:00:00Z',
    }), AGORA)
    expect(a).toEqual({ liberado: true, motivo: 'assinatura' })
  })

  it('não tranca quem teve o cartão recusado uma vez', () => {
    const a = avaliarAcesso(estado({ assinatura_status: 'past_due' }), AGORA)
    expect(a).toEqual({ liberado: true, motivo: 'cobranca_falhou' })
  })

  it('fecha quando o Stripe desistiu de cobrar', () => {
    for (const status of ['canceled', 'unpaid', 'incomplete_expired', 'paused']) {
      expect(avaliarAcesso(estado({ assinatura_status: status }), AGORA))
        .toEqual({ liberado: false, motivo: 'assinatura_acabou' })
    }
  })

  it('quem cancelou não volta para o teste', () => {
    // o teste ainda estaria de pé pela data, mas assinar já gastou a cortesia
    const a = avaliarAcesso(estado({
      trial_termina_em: '2026-08-20T12:00:00Z',
      assinatura_status: 'canceled',
    }), AGORA)
    expect(a).toEqual({ liberado: false, motivo: 'assinatura_acabou' })
  })

  it('libera quem cancelou mas ainda está no período pago', () => {
    // o Stripe segura o status em `active` até o fim do período
    const a = avaliarAcesso(estado({
      assinatura_status: 'active',
      cancela_no_fim: true,
      assinatura_ate: '2026-08-20T12:00:00Z',
    }), AGORA)
    expect(a).toEqual({ liberado: true, motivo: 'assinatura' })
  })

  it('libera assinatura ativa com período vencido: webhook perdido não tranca pagante', () => {
    const a = avaliarAcesso(estado({
      assinatura_status: 'active',
      assinatura_ate: '2026-06-01T12:00:00Z',
    }), AGORA)
    expect(a.liberado).toBe(true)
  })

  it('libera perfil sem nenhum dado de assinatura, e sem alarme', () => {
    // a leitura do perfil pode ter falhado; dizer "seu teste acabou" para quem
    // está pagando é o pior palpite possível
    for (const entrada of [null, estado({}), estado({ trial_termina_em: 'lixo' })]) {
      expect(avaliarAcesso(entrada, AGORA)).toEqual({ liberado: true, motivo: 'indefinido' })
    }
  })
})


describe('deveAvisarDoTeste', () => {
  it('avisa só na reta final', () => {
    expect(deveAvisarDoTeste({ liberado: true, motivo: 'teste', diasRestantes: 14 })).toBe(false)
    expect(deveAvisarDoTeste({ liberado: true, motivo: 'teste', diasRestantes: 5 })).toBe(true)
    expect(deveAvisarDoTeste({ liberado: true, motivo: 'teste', diasRestantes: 1 })).toBe(true)
  })

  it('não avisa quem já assinou', () => {
    expect(deveAvisarDoTeste({ liberado: true, motivo: 'assinatura' })).toBe(false)
  })

  it('não avisa quando não se sabe', () => {
    expect(deveAvisarDoTeste({ liberado: true, motivo: 'indefinido' })).toBe(false)
    expect(temAvisoDeAssinatura({ liberado: true, motivo: 'indefinido' })).toBe(false)
  })
})
