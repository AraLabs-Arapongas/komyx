/**
 * Quem pode usar o app, e por quê.
 *
 * Uma função só, sem framework e sem rede, porque a resposta aparece em três
 * lugares — o portão do layout, o aviso de teste acabando e a tela de
 * assinatura — e três cópias da regra viram três respostas diferentes no dia
 * em que alguém atrasa o cartão.
 */

/** o que a assinatura do escritório informa sobre o membro (rpc meu_escritorio) */
export type AssinaturaEscritorio = {
  /** 'ativa' | 'encerrada' | null (aguardando ativação) — gerido pelo admin */
  assinatura_status: string | null
  assinatura_ate: string | null
}

/** o que o banco guarda sobre a assinatura do corretor */
export type EstadoAssinatura = {
  /** fim do teste de 14 dias, contado do cadastro */
  trial_termina_em: string | null
  /** status cru do Stripe; nulo enquanto nunca assinou */
  assinatura_status: string | null
  assinatura_ate: string | null
  cancela_no_fim?: boolean | null
  /** vínculo ativo com escritório, se houver */
  escritorio?: AssinaturaEscritorio | null
}

export type Acesso =
  /** coberto pelo escritório onde trabalha: não paga plano individual */
  | { liberado: true; motivo: 'escritorio' }
  | { liberado: true; motivo: 'assinatura' }
  | { liberado: true; motivo: 'teste'; diasRestantes: number }
  | { liberado: true; motivo: 'cobranca_falhou' }
  /** não deu para saber; libera e não afirma nada */
  | { liberado: true; motivo: 'indefinido' }
  | { liberado: false; motivo: 'teste_acabou' }
  | { liberado: false; motivo: 'assinatura_acabou' }

const DIA = 24 * 60 * 60 * 1000

/*
 * `past_due` continua liberado de propósito.
 *
 * É o estado de um cartão que recusou uma vez — o Stripe ainda vai tentar de
 * novo por alguns dias antes de desistir. Bloquear no primeiro "não" tranca
 * fora do app quem está pagando e só trocou de cartão; quando ele desiste de
 * verdade, o status vira `canceled` ou `unpaid` e aí sim o portão fecha.
 */
const STATUS_LIBERADOS = new Set(['active', 'trialing', 'past_due'])

/**
 * @param agora injetado para o teste poder viajar no tempo; em produção é
 * sempre `new Date()`
 */
export function avaliarAcesso(estado: EstadoAssinatura | null, agora: Date = new Date()): Acesso {
  /*
   * Escritório ativo vence tudo, inclusive assinatura individual.
   *
   * É o contrato do Enterprise: enquanto o escritório paga, o membro não
   * paga — nem vê aviso de teste, nem portão. `assinatura_ate` nula é "sem
   * prazo definido" (admin ativou sem data), não é vencida; a data só fecha
   * quando existe e já passou, e aí o corretor cai no fluxo individual dele
   * (o teste que tinha, ou a assinatura própria).
   */
  const escritorio = estado?.escritorio
  if (escritorio?.assinatura_status === 'ativa') {
    const ate = escritorio.assinatura_ate ? new Date(escritorio.assinatura_ate) : null
    const vigente = !ate || Number.isNaN(ate.getTime()) || ate.getTime() > agora.getTime()
    if (vigente) return { liberado: true, motivo: 'escritorio' }
  }

  const status = estado?.assinatura_status ?? null

  if (status && STATUS_LIBERADOS.has(status)) {
    /*
     * Aqui o status manda, e `assinatura_ate` só serve para a tela dizer
     * quando renova. Desconfiar da data significaria trancar um assinante em
     * dia porque um webhook se perdeu — o erro caro é esse, não o oposto.
     */
    return status === 'past_due'
      ? { liberado: true, motivo: 'cobranca_falhou' }
      : { liberado: true, motivo: 'assinatura' }
  }

  // Já assinou e a assinatura morreu: não volta para o teste. O teste é uma
  // vez só, senão cancelar e recomeçar seria assinatura de graça.
  if (status) return { liberado: false, motivo: 'assinatura_acabou' }

  const fimDoTeste = estado?.trial_termina_em ? new Date(estado.trial_termina_em) : null
  if (!fimDoTeste || Number.isNaN(fimDoTeste.getTime())) {
    /*
     * Sem data de teste não há o que afirmar: pode ser um perfil de antes da
     * coluna existir, ou a leitura do perfil ter falhado. Libera e cala.
     *
     * O caso importa: tratar isto como "teste com 0 dias restantes" acendia a
     * tarja de aviso em todas as telas, dizendo a quem está pagando que o
     * teste dele acabou. Dado que falta não vira alarme.
     */
    return { liberado: true, motivo: 'indefinido' }
  }

  const restante = fimDoTeste.getTime() - agora.getTime()
  if (restante <= 0) return { liberado: false, motivo: 'teste_acabou' }

  // arredonda para cima: faltando 30 minutos ainda é "1 dia", não "0 dias"
  return { liberado: true, motivo: 'teste', diasRestantes: Math.ceil(restante / DIA) }
}

/**
 * O aviso de teste acabando só aparece na reta final. Antes disso ele é ruído
 * diário sobre algo que ainda não é decisão de ninguém.
 */
export function deveAvisarDoTeste(acesso: Acesso): boolean {
  return acesso.liberado && acesso.motivo === 'teste' && acesso.diasRestantes <= 5
}

/**
 * Se existe tarja no topo do app.
 *
 * O layout precisa saber disto antes de renderizar, e não só depois: o hero do
 * painel sobe por cima do que vier antes dele, então a presença da tarja muda
 * o recuo da tela inteira.
 */
export function temAvisoDeAssinatura(acesso: Acesso): boolean {
  return deveAvisarDoTeste(acesso) || (acesso.liberado && acesso.motivo === 'cobranca_falhou')
}
