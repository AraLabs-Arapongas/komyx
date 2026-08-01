'use server'
import { createClient } from '@/lib/supabase/server'
import { configFinanceiraSchema, type ConfigFinanceiraForm } from '@/lib/domain/schemas'
import { fecharCompetenciasVencidas, recalcularCompetencia } from './recalcular'

export async function salvarConfig(input: ConfigFinanceiraForm) {
  const parsed = configFinanceiraSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false as const, erro: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, erro: 'Sessão expirada. Entre novamente.' }

  const d = parsed.data
  // fecha competências vencidas com a config ANTIGA ainda ativa, antes de trocar a política
  // (meses já fechados não podem ser recalculados retroativamente com a nova config)
  await fecharCompetenciasVencidas(supabase)
  await supabase.from('config_financeira').update({ ativa: false }).eq('ativa', true)
  const { error } = await supabase.from('config_financeira').insert({
    corretor_id: user.id, nome_politica: d.nomePolitica, faixas: d.faixas,
    dia_fechamento: d.diaFechamento, dia_primeiro_pagamento: d.diaPrimeiroPagamento,
    regras_estorno: d.regrasEstorno, ativa: true,
  })
  if (error) return { ok: false as const, erro: 'Não foi possível salvar. Tente novamente.' }

  // recalcula competências abertas com as novas regras (retroativo no mês corrente)
  const { data: abertas } = await supabase.from('competencias').select('id').eq('status', 'aberta')
  for (const c of abertas ?? []) await recalcularCompetencia(supabase, c.id)
  return { ok: true as const }
}
