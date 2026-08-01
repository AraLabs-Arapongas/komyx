'use server'
import { createClient } from '@/lib/supabase/server'
import { vendaFormSchema, type VendaForm } from '@/lib/domain/schemas'
import { competenciaDaVenda } from '@/lib/engine/calendario'
import { garantirCompetencia, recalcularCompetencia } from './recalcular'

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
  const supabase = await createClient()
  const { data: rec, error } = await supabase.from('recebimentos')
    .update({ status: 'recebido', data_recebimento: dataRecebimento })
    .eq('id', recebimentoId).eq('status', 'previsto')
    .select('comissao_id').single()
  if (error) return { ok: false as const, erro: 'Não foi possível registrar o recebimento.' }

  const { data: irmaos } = await supabase.from('recebimentos')
    .select('status').eq('comissao_id', rec.comissao_id)
  const pendentes = (irmaos ?? []).filter(r => r.status === 'previsto').length
  await supabase.from('comissoes')
    .update({ status: pendentes === 0 ? 'recebida' : 'parcial', updated_at: new Date().toISOString() })
    .eq('id', rec.comissao_id)
  return { ok: true as const }
}
