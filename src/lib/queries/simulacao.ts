'use client'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { calcularCompetencia } from '@/lib/engine/calculo'
import { competenciaDaVenda } from '@/lib/engine/calendario'
import type { Faixa } from '@/lib/domain/types'

/**
 * Quanto esta venda paga, respondido enquanto o corretor digita o valor.
 *
 * Não dá para multiplicar a carta pelo percentual e pronto: a faixa vale pelo
 * ACUMULADO do mês e é retroativa. Uma venda pode empurrar o mês inteiro para
 * a faixa de cima — e aí ela não muda só a própria comissão, muda a das outras
 * vendas já registradas. Prometer um número que o servidor depois recalcula
 * para outro seria pior do que não prometer nada.
 *
 * Por isso a simulação roda o mesmo motor do servidor, sobre as vendas reais da
 * competência. O valor digitado não entra na chave da consulta: as vendas do
 * mês são buscadas uma vez e o cálculo acontece na memória a cada tecla.
 */
export type SimulacaoVenda = {
  comissaoCentavos: number
  percentual: number
  nParcelas: number
  parcelaCentavos: number
  primeiraParcela: string
  /** a venda puxou o mês para outra faixa — as outras vendas também mudam */
  mudouFaixa: boolean
  /** quanto as OUTRAS vendas do mês ganham (ou perdem) por causa desta */
  efeitoNasOutrasCentavos: number
}

function hojeSP(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}

type ContextoMes = {
  faixas: Faixa[]
  diaFechamento: number
  diaPrimeiroPagamento: number
  competencia: { ano: number; mes: number }
  outras: { id: string; valorCartaCentavos: number; status: 'confirmada' }[]
}

/**
 * Config ativa + vendas já confirmadas da competência em que esta venda cai.
 * `ignorarVendaId` tira do bolo a venda que está sendo editada, senão ela
 * contaria duas vezes.
 */
function useContextoDoMes(dataVenda: string | null, ignorarVendaId?: string) {
  return useQuery({
    queryKey: ['simulacao-contexto', dataVenda, ignorarVendaId ?? ''],
    enabled: dataVenda !== null,
    queryFn: async (): Promise<ContextoMes | null> => {
      const supabase = createClient()
      const { data: cfg } = await supabase.from('config_financeira')
        .select('*').eq('ativa', true).maybeSingle()
      if (!cfg) return null

      const competencia = competenciaDaVenda(dataVenda!, cfg.dia_fechamento)
      const { data: vendas } = await supabase.from('vendas')
        .select('id, valor_carta_centavos, status, competencias!inner(ano, mes)')
        .eq('competencias.ano', competencia.ano)
        .eq('competencias.mes', competencia.mes)
        .eq('status', 'confirmada')

      return {
        faixas: cfg.faixas as unknown as Faixa[],
        diaFechamento: cfg.dia_fechamento,
        diaPrimeiroPagamento: cfg.dia_primeiro_pagamento,
        competencia,
        outras: (vendas ?? [])
          .filter(v => v.id !== ignorarVendaId)
          .map(v => ({ id: v.id, valorCartaCentavos: Number(v.valor_carta_centavos), status: 'confirmada' as const })),
      }
    },
  })
}

const NOVA = '__simulada__'

export function useSimulacaoVenda(
  { valorCentavos, dataVenda, ignorarVendaId }:
  { valorCentavos: number; dataVenda: string | null; ignorarVendaId?: string },
): { simulacao: SimulacaoVenda | null; carregando: boolean } {
  const { data: ctx, isLoading } = useContextoDoMes(dataVenda, ignorarVendaId)

  if (!ctx || valorCentavos <= 0) return { simulacao: null, carregando: isLoading }

  const config = {
    faixas: ctx.faixas,
    calendario: { diaFechamento: ctx.diaFechamento, diaPrimeiroPagamento: ctx.diaPrimeiroPagamento },
  }
  const base = {
    config, competencia: ctx.competencia, recebimentosExistentes: [],
    hoje: hojeSP(),
  }

  const com = calcularCompetencia({
    ...base,
    vendas: [...ctx.outras, { id: NOVA, valorCartaCentavos: valorCentavos, status: 'confirmada' }],
  })
  const nova = com.comissoes.find(c => c.vendaId === NOVA)
  if (!nova) return { simulacao: null, carregando: false }

  // o mesmo mês sem esta venda: a diferença é o que ela faz com as outras
  const sem = calcularCompetencia({ ...base, vendas: ctx.outras })
  const outrasAntes = sem.comissoes.reduce((s, c) => s + c.valorCentavos, 0)
  const outrasDepois = com.comissoes
    .filter(c => c.vendaId !== NOVA)
    .reduce((s, c) => s + c.valorCentavos, 0)

  const parcelas = com.recebimentosPrevistos.filter(p => p.vendaId === NOVA)
  const primeira = parcelas.reduce<string | null>(
    (menor, p) => (menor === null || p.dataPrevista < menor ? p.dataPrevista : menor), null)

  return {
    carregando: false,
    simulacao: {
      comissaoCentavos: nova.valorCentavos,
      percentual: nova.percentual,
      nParcelas: nova.nParcelas,
      parcelaCentavos: parcelas[0]?.valorCentavos ?? 0,
      primeiraParcela: primeira ?? '',
      mudouFaixa: ctx.outras.length > 0 && outrasDepois !== outrasAntes,
      efeitoNasOutrasCentavos: outrasDepois - outrasAntes,
    },
  }
}
