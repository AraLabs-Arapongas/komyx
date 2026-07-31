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

export type VendaStatus = 'rascunho' | 'confirmada' | 'cancelada' | 'estornada' | 'arquivada'
export type RecebimentoStatus = 'previsto' | 'recebido' | 'cancelado' | 'estornado'
export type ComissaoStatus = 'prevista' | 'parcial' | 'recebida' | 'cancelada' | 'estornada'
