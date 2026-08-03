import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/lib/supabase/database.types'
import type { CompetenciaRef, ConfigCalc } from '@/lib/domain/types'
import { calcularCompetencia } from '@/lib/engine/calculo'

type SB = SupabaseClient<Database>

export type ConfigRow = Database['public']['Tables']['config_financeira']['Row']

/**
 * A config que vale para o corretor logado.
 *
 * Não é `config_financeira where ativa` — desde as políticas de escritório
 * existe mais de uma candidata, e quem resolve a disputa (específica do
 * escritório > geral do escritório > a própria) é a função no banco. Todo
 * caminho que precisa da config vigente passa por aqui; ler a tabela direto é
 * ler a config errada para quem está num escritório.
 */
export async function configEfetiva(supabase: SB): Promise<ConfigRow | null> {
  const { data } = await supabase.rpc('config_efetiva')
  const linhas = (data ?? []) as ConfigRow[]
  return linhas[0] ?? null
}

export async function fecharCompetenciasVencidas(supabase: SB): Promise<void> {
  const config = await configEfetiva(supabase)
  if (!config) return
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
  await supabase.rpc('fechar_competencias_vencidas', { p_snapshot: config as never, p_hoje: hoje })
}

export async function garantirCompetencia(supabase: SB, userId: string, ref: CompetenciaRef): Promise<string> {
  await fecharCompetenciasVencidas(supabase)

  const { data: existente } = await supabase.from('competencias')
    .select('id').eq('ano', ref.ano).eq('mes', ref.mes).eq('corretor_id', userId).maybeSingle()
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
  let configId: string | null = null
  let volumeExterno = 0

  if (comp.status === 'fechada' && comp.config_snapshot) {
    const s = comp.config_snapshot as Record<string, unknown>
    config = {
      faixas: s.faixas as ConfigCalc['faixas'],
      calendario: { diaFechamento: s.dia_fechamento as number, diaPrimeiroPagamento: s.dia_primeiro_pagamento as number },
    }
    /*
     * Mês fechado recalcula (um estorno, por exemplo) com o MESMO volume de
     * equipe que valia quando fechou. Buscar o volume de hoje reescreveria a
     * faixa de um mês encerrado porque um colega vendeu ou estornou depois —
     * o passado do corretor mudando por movimento alheio, exatamente o que o
     * snapshot existe para impedir.
     */
    volumeExterno = Number(comp.volume_externo_aplicado ?? 0)
  } else {
    const cfg = await configEfetiva(supabase)
    if (!cfg) throw new Error('Configure como seu escritório paga comissão antes de continuar.')
    config = {
      faixas: cfg.faixas as ConfigCalc['faixas'],
      calendario: { diaFechamento: cfg.dia_fechamento, diaPrimeiroPagamento: cfg.dia_primeiro_pagamento },
    }
    configId = cfg.id
    if (cfg.faixa_por_escritorio) {
      const { data: vol } = await supabase.rpc('volume_do_escritorio', { p_ano: comp.ano, p_mes: comp.mes })
      volumeExterno = Number(vol ?? 0)
    }
  }

  const { data: vendas } = await supabase.from('vendas')
    .select('id, valor_carta_centavos, status').eq('competencia_id', competenciaId)
  const { data: recs } = await supabase.from('recebimentos')
    .select('id, numero_parcela, valor_centavos, data_prevista, status, comissoes!inner(venda_id, vendas!inner(competencia_id))')
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
      status: r.status as 'recebido', dataPrevista: r.data_prevista,
    })),
    hoje: new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }),
    volumeExterno,
  })

  const { error: e3 } = await supabase.rpc('aplicar_resultado', {
    p_competencia_id: competenciaId,
    p_resultado: resultado as unknown as Json,
  })
  if (e3) throw e3

  /*
   * A competência lembra com o que foi calculada. É o que a reconciliação lê
   * na próxima abertura do app para saber se a política do escritório ou o
   * volume da equipe mudaram por baixo dela.
   */
  if (comp.status !== 'fechada') {
    await supabase.from('competencias')
      .update({ config_aplicada: configId, volume_externo_aplicado: volumeExterno })
      .eq('id', competenciaId)
  }
}

/**
 * Reconciliação preguiçosa: recalcula as competências abertas cujo mundo
 * mudou por baixo — a política efetiva trocou, ou (com faixa por escritório)
 * o volume da equipe já não é o que foi aplicado.
 *
 * Existe porque o dono NÃO TEM COMO recalcular os números de um membro: as
 * policies e os RPCs escrevem com auth.uid(). Então quem corrige é o app do
 * próprio corretor, na primeira abertura depois da mudança. Roda no layout a
 * cada request; no caso comum — nada mudou — custa uma consulta indexada.
 */
export async function reconciliarCompetencias(supabase: SB): Promise<void> {
  const cfg = await configEfetiva(supabase)
  if (!cfg) return

  const { data: abertas } = await supabase.from('competencias')
    .select('id, ano, mes, config_aplicada, volume_externo_aplicado')
    .eq('status', 'aberta')

  for (const comp of abertas ?? []) {
    let desatualizada = comp.config_aplicada !== cfg.id
    if (!desatualizada && cfg.faixa_por_escritorio) {
      const { data: vol } = await supabase.rpc('volume_do_escritorio', { p_ano: comp.ano, p_mes: comp.mes })
      desatualizada = Number(vol ?? 0) !== Number(comp.volume_externo_aplicado ?? 0)
    }
    if (desatualizada) await recalcularCompetencia(supabase, comp.id)
  }
}
