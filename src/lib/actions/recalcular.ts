import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/lib/supabase/database.types'
import type { CompetenciaRef, ConfigCalc } from '@/lib/domain/types'
import { calcularCompetencia } from '@/lib/engine/calculo'

type SB = SupabaseClient<Database>

export async function garantirCompetencia(supabase: SB, userId: string, ref: CompetenciaRef): Promise<string> {
  const { data: config } = await supabase.from('config_financeira')
    .select('*').eq('ativa', true).single()
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
  await supabase.rpc('fechar_competencias_vencidas', { p_snapshot: config, p_hoje: hoje })

  const { data: existente } = await supabase.from('competencias')
    .select('id').eq('ano', ref.ano).eq('mes', ref.mes).maybeSingle()
  if (existente) return existente.id
  const { data: nova, error } = await supabase.from('competencias')
    .insert({ corretor_id: userId, ano: ref.ano, mes: ref.mes }).select('id').single()
  if (error) throw error
  return nova.id
}

export async function recalcularCompetencia(supabase: SB, competenciaId: string): Promise<void> {
  const { data: comp, error: e1 } = await supabase.from('competencias')
    .select('*').eq('id', competenciaId).single()
  if (e1) throw e1

  let config: ConfigCalc
  if (comp.status === 'fechada' && comp.config_snapshot) {
    const s = comp.config_snapshot as Record<string, unknown>
    config = {
      faixas: s.faixas as ConfigCalc['faixas'],
      calendario: { diaFechamento: s.dia_fechamento as number, diaPrimeiroPagamento: s.dia_primeiro_pagamento as number },
    }
  } else {
    const { data: cfg, error: e2 } = await supabase.from('config_financeira')
      .select('*').eq('ativa', true).single()
    if (e2) throw new Error('Configure como seu escritório paga comissão antes de continuar.')
    config = {
      faixas: cfg.faixas as ConfigCalc['faixas'],
      calendario: { diaFechamento: cfg.dia_fechamento, diaPrimeiroPagamento: cfg.dia_primeiro_pagamento },
    }
  }

  const { data: vendas } = await supabase.from('vendas')
    .select('id, valor_carta_centavos, status').eq('competencia_id', competenciaId)
  const { data: recs } = await supabase.from('recebimentos')
    .select('id, numero_parcela, valor_centavos, status, comissoes!inner(venda_id, vendas!inner(competencia_id))')
    .eq('comissoes.vendas.competencia_id', competenciaId)

  const resultado = calcularCompetencia({
    config,
    competencia: { ano: comp.ano, mes: comp.mes },
    vendas: (vendas ?? []).map(v => ({
      id: v.id, valorCartaCentavos: Number(v.valor_carta_centavos),
      status: v.status as 'confirmada',
    })),
    recebimentosExistentes: (recs ?? []).map(r => ({
      id: r.id, vendaId: (r.comissoes as unknown as { venda_id: string }).venda_id,
      numeroParcela: r.numero_parcela, valorCentavos: Number(r.valor_centavos),
      status: r.status as 'recebido',
    })),
  })

  const { error: e3 } = await supabase.rpc('aplicar_resultado', {
    p_competencia_id: competenciaId,
    p_resultado: resultado as unknown as Json,
  })
  if (e3) throw e3
}
