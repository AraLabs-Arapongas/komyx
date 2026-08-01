'use server'
import { createClient } from '@/lib/supabase/server'
import { vendaFormSchema, type VendaForm } from '@/lib/domain/schemas'
import { competenciaDaVenda } from '@/lib/engine/calendario'
import { fecharCompetenciasVencidas, garantirCompetencia, recalcularCompetencia } from './recalcular'

async function contexto() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Sessão expirada. Entre novamente.')
  const { data: config } = await supabase.from('config_financeira')
    .select('dia_fechamento').eq('ativa', true).single()
  if (!config) throw new Error('Configure como seu escritório paga comissão antes de registrar vendas.')
  return { supabase, user, diaFechamento: config.dia_fechamento }
}

export async function criarVenda(input: VendaForm) {
  try {
    const parsed = vendaFormSchema.safeParse(input)
    if (!parsed.success)
      return { ok: false as const, erro: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }
    const { supabase, user, diaFechamento } = await contexto()
    const d = parsed.data
    const ref = competenciaDaVenda(d.dataVenda, diaFechamento)
    const competenciaId = await garantirCompetencia(supabase, user.id, ref)
    const { data: venda, error } = await supabase.from('vendas').insert({
      corretor_id: user.id, cliente_id: d.clienteId, competencia_id: competenciaId,
      valor_carta_centavos: d.valorCartaCentavos, administradora: d.administradora,
      grupo: d.grupo, cota: d.cota, data_venda: d.dataVenda,
      observacoes: d.observacoes, status: 'confirmada',
    }).select('id').single()
    if (error) return { ok: false as const, erro: 'Não foi possível salvar a venda.' }
    await recalcularCompetencia(supabase, competenciaId)
    return { ok: true as const, vendaId: venda.id }
  } catch (e) {
    return { ok: false as const, erro: e instanceof Error ? e.message : 'Erro inesperado.' }
  }
}

export async function editarVenda(id: string, input: VendaForm) {
  try {
    const parsed = vendaFormSchema.safeParse(input)
    if (!parsed.success)
      return { ok: false as const, erro: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }
    const { supabase, user, diaFechamento } = await contexto()
    const d = parsed.data
    const { data: atual, error: e1 } = await supabase.from('vendas')
      .select('competencia_id').eq('id', id).single()
    if (e1) return { ok: false as const, erro: 'Venda não encontrada.' }
    const ref = competenciaDaVenda(d.dataVenda, diaFechamento)
    const novaCompetenciaId = await garantirCompetencia(supabase, user.id, ref)
    if (novaCompetenciaId !== atual.competencia_id) {
      const { data: recebidos } = await supabase.from('recebimentos')
        .select('id, comissoes!inner(venda_id)')
        .eq('comissoes.venda_id', id).eq('status', 'recebido').limit(1)
      if (recebidos && recebidos.length > 0)
        return { ok: false as const, erro: 'Esta venda já tem parcelas recebidas. Não é possível mover a venda para outro mês.' }
    }
    const { error } = await supabase.from('vendas').update({
      cliente_id: d.clienteId, valor_carta_centavos: d.valorCartaCentavos,
      administradora: d.administradora, grupo: d.grupo, cota: d.cota,
      data_venda: d.dataVenda, observacoes: d.observacoes,
      competencia_id: novaCompetenciaId, updated_at: new Date().toISOString(),
    }).eq('id', id)
    if (error) return { ok: false as const, erro: 'Não foi possível salvar as alterações.' }
    await recalcularCompetencia(supabase, novaCompetenciaId)
    if (atual.competencia_id !== novaCompetenciaId)
      await recalcularCompetencia(supabase, atual.competencia_id)
    return { ok: true as const }
  } catch (e) {
    return { ok: false as const, erro: e instanceof Error ? e.message : 'Erro inesperado.' }
  }
}

export async function cancelarVenda(id: string, motivo: string) {
  try {
    if (!motivo.trim()) return { ok: false as const, erro: 'Informe o motivo do cancelamento.' }
    const { supabase } = await contexto()
    await fecharCompetenciasVencidas(supabase)
    const { data: venda, error } = await supabase.from('vendas')
      .update({ status: 'cancelada', motivo_cancelamento: motivo, updated_at: new Date().toISOString() })
      .eq('id', id).select('competencia_id').single()
    if (error) return { ok: false as const, erro: 'Não foi possível cancelar a venda.' }
    await recalcularCompetencia(supabase, venda.competencia_id)
    return { ok: true as const }
  } catch (e) {
    return { ok: false as const, erro: e instanceof Error ? e.message : 'Erro inesperado.' }
  }
}

export async function marcarRecebido(recebimentoId: string, dataRecebimento: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false as const, erro: 'Sessão expirada. Entre novamente.' }
    const { error } = await supabase.rpc('marcar_recebido', {
      p_recebimento_id: recebimentoId, p_data: dataRecebimento,
    })
    if (error) return { ok: false as const, erro: 'Não foi possível registrar o recebimento.' }
    return { ok: true as const }
  } catch (e) {
    return { ok: false as const, erro: e instanceof Error ? e.message : 'Erro inesperado.' }
  }
}

/**
 * Cliente desistiu depois da venda fechada. `cobrarRecebido` diz se o
 * escritório vai descontar as parcelas que já caíram na conta do corretor.
 */
export async function estornarVenda(id: string, motivo: string, cobrarRecebido: boolean) {
  try {
    if (!motivo.trim()) return { ok: false as const, erro: 'Informe o motivo da desistência.' }
    const { supabase } = await contexto()
    const { data: venda, error: e1 } = await supabase.from('vendas')
      .select('competencia_id').eq('id', id).single()
    if (e1) return { ok: false as const, erro: 'Venda não encontrada.' }

    const { error } = await supabase.rpc('estornar_venda', {
      p_venda_id: id, p_motivo: motivo, p_cobrar_recebido: cobrarRecebido,
    })
    if (error) return { ok: false as const, erro: 'Não foi possível registrar a desistência.' }

    await recalcularCompetencia(supabase, venda.competencia_id)
    return { ok: true as const }
  } catch (e) {
    return { ok: false as const, erro: e instanceof Error ? e.message : 'Erro inesperado.' }
  }
}

export async function desmarcarRecebido(recebimentoId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false as const, erro: 'Sessão expirada. Entre novamente.' }
    const { error } = await supabase.rpc('desmarcar_recebido', {
      p_recebimento_id: recebimentoId,
    })
    if (error) return { ok: false as const, erro: 'Não foi possível desfazer o recebimento.' }
    return { ok: true as const }
  } catch (e) {
    return { ok: false as const, erro: e instanceof Error ? e.message : 'Erro inesperado.' }
  }
}

/** Confirma de uma vez todas as parcelas vencidas até hoje. */
export async function marcarRecebidosVencidos(ate: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false as const, erro: 'Sessão expirada. Entre novamente.' }
    const { data, error } = await supabase.rpc('marcar_recebidos_vencidos', {
      p_ate: ate, p_data: ate,
    })
    if (error) return { ok: false as const, erro: 'Não foi possível registrar os recebimentos.' }
    return { ok: true as const, quantidade: data ?? 0 }
  } catch (e) {
    return { ok: false as const, erro: e instanceof Error ? e.message : 'Erro inesperado.' }
  }
}
