export type Faixa = {
  min: number            // centavos, inclusivo
  max: number | null     // centavos, inclusivo; null = sem teto
  percentual: number     // pontos percentuais: 0.5 = 0,5%
  parcelas: number
}

export type Calendario = {
  diaFechamento: number          // 1-31
  diaPrimeiroPagamento: number   // 1-31
}

export type ConfigCalc = { faixas: Faixa[]; calendario: Calendario }

export type CompetenciaRef = { ano: number; mes: number } // mes 1-12

/** O que o escritório faz com a comissão quando o cliente desiste. */
export type PoliticaEstorno = 'perguntar' | 'tudo' | 'proximas'

export const ROTULOS_ESTORNO: Record<PoliticaEstorno, { titulo: string; apoio: string }> = {
  perguntar: {
    titulo: 'Perguntar na hora',
    apoio: 'A cada desistência você escolhe se o escritório vai descontar o que já foi pago.',
  },
  tudo: {
    titulo: 'Estornar tudo',
    apoio: 'Cancela as parcelas futuras e o escritório desconta as que você já recebeu.',
  },
  proximas: {
    titulo: 'Estornar só as próximas',
    apoio: 'Cancela as parcelas futuras. O que você já recebeu continua seu.',
  },
}

export type VendaStatus = 'rascunho' | 'confirmada' | 'cancelada' | 'estornada' | 'arquivada'
export type RecebimentoStatus = 'previsto' | 'recebido' | 'cancelado' | 'estornado'
export type ComissaoStatus = 'prevista' | 'parcial' | 'recebida' | 'cancelada' | 'estornada'
