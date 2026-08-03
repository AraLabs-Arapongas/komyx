'use server'
import { createClient } from '@/lib/supabase/server'
import { configFinanceiraSchema, type ConfigFinanceiraForm } from '@/lib/domain/schemas'
import { reconciliarCompetencias } from '@/lib/actions/recalcular'

/**
 * As ações do módulo de escritório.
 *
 * Quase tudo aqui é casca fina sobre RPCs `security definer` — as invariantes
 * (um vínculo ativo por corretor, dono não sai, aceite valida token) moram no
 * banco, porque é lá que elas não podem ser contornadas. O que estas funções
 * fazem é validar sessão e traduzir os erros do Postgres para frases que um
 * corretor entende.
 */

/*
 * Os RAISE EXCEPTION dos RPCs chegam como message do PostgREST. O código de
 * erro é o contrato entre o SQL e esta tabela; mudar um exige mudar o outro.
 */
const ERROS: Record<string, string> = {
  ja_tem_escritorio: 'Você já faz parte de um escritório. Saia dele antes de entrar em outro.',
  convite_invalido: 'Este convite não vale mais. Peça um novo ao seu escritório.',
  membro_indisponivel: 'Este membro não está mais na equipe.',
  dono_nao_sai: 'O dono não pode sair do próprio escritório.',
  nao_e_dono: 'Só o dono do escritório pode ver isto.',
  sem_vinculo: 'Você não faz parte de nenhum escritório.',
  nome_obrigatorio: 'Dê um nome ao escritório.',
  sem_sessao: 'Sessão expirada. Entre novamente.',
}

function traduzir(mensagem: string | undefined, padrao: string): string {
  for (const [codigo, frase] of Object.entries(ERROS)) {
    if (mensagem?.includes(codigo)) return frase
  }
  return padrao
}

type Resultado<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true; dados: T })
  | { ok: false; erro: string }

export async function criarEscritorio(nome: string): Promise<Resultado> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.rpc('criar_escritorio', { p_nome: nome })
    if (error) return { ok: false, erro: traduzir(error.message, 'Não foi possível criar o escritório.') }
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro inesperado.' }
  }
}

export async function convidar(email: string): Promise<Resultado<{ token: string }>> {
  try {
    const limpo = email.trim().toLowerCase()
    if (!limpo) return { ok: false, erro: 'Informe o e-mail de quem você quer convidar.' }
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, erro: ERROS.sem_sessao }

    // o escritório do dono: a policy de insert exige o id certo, mas o
    // formulário não precisa saber dele
    const { data: escritorioId } = await supabase.rpc('meu_escritorio_como_dono')
    if (!escritorioId) return { ok: false, erro: ERROS.nao_e_dono }

    const { data, error } = await supabase.from('convites_escritorio')
      .insert({ escritorio_id: escritorioId, email: limpo })
      .select('token').single()
    if (error || !data) return { ok: false, erro: 'Não foi possível criar o convite.' }
    return { ok: true, dados: { token: data.token } }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro inesperado.' }
  }
}

export async function revogarConvite(id: string): Promise<Resultado> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('convites_escritorio')
      .update({ status: 'revogado' }).eq('id', id).eq('status', 'pendente')
    if (error) return { ok: false, erro: 'Não foi possível revogar o convite.' }
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro inesperado.' }
  }
}

export async function aceitarConvite(token: string): Promise<Resultado> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.rpc('aceitar_convite', { p_token: token })
    if (error) return { ok: false, erro: traduzir(error.message, 'Não foi possível aceitar o convite.') }
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro inesperado.' }
  }
}

export async function removerMembro(membroId: string): Promise<Resultado> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.rpc('remover_membro', { p_membro_id: membroId })
    if (error) return { ok: false, erro: traduzir(error.message, 'Não foi possível remover o membro.') }
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro inesperado.' }
  }
}

export async function sairDoEscritorio(): Promise<Resultado> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.rpc('sair_do_escritorio')
    if (error) return { ok: false, erro: traduzir(error.message, 'Não foi possível sair do escritório.') }
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro inesperado.' }
  }
}

/**
 * Grava a política de comissão do escritório — a geral (`aplicaA` nulo) ou a
 * específica de um corretor.
 *
 * Mesmo versionamento da config pessoal: desativa a vigente do escopo e
 * insere uma linha nova, nunca update — as competências fechadas guardam
 * snapshot da versão que valia nelas.
 *
 * Os números dos membros NÃO são recalculados aqui: não há como, as policies
 * escrevem com auth.uid(). Cada membro reconcilia na abertura seguinte do
 * app. Os do próprio dono, que também é membro, reconciliam já.
 */
export async function salvarPoliticaEscritorio(
  input: ConfigFinanceiraForm,
  opts: { aplicaA?: string | null; faixaPorEscritorio?: boolean } = {},
): Promise<Resultado> {
  try {
    const parsed = configFinanceiraSchema.safeParse(input)
    if (!parsed.success)
      return { ok: false, erro: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }

    const supabase = await createClient()
    const { data: escritorioId } = await supabase.rpc('meu_escritorio_como_dono')
    if (!escritorioId) return { ok: false, erro: ERROS.nao_e_dono }

    const aplicaA = opts.aplicaA ?? null
    const d = parsed.data

    let desativar = supabase.from('config_financeira')
      .update({ ativa: false }).eq('ativa', true).eq('escritorio_id', escritorioId)
    desativar = aplicaA ? desativar.eq('aplica_a', aplicaA) : desativar.is('aplica_a', null)
    const { error: e1 } = await desativar
    if (e1) return { ok: false, erro: 'Não foi possível atualizar a política.' }

    const { error: e2 } = await supabase.from('config_financeira').insert({
      escritorio_id: escritorioId, aplica_a: aplicaA,
      nome_politica: aplicaA ? 'Política específica' : 'Política do escritório',
      faixas: d.faixas, dia_fechamento: d.diaFechamento,
      dia_primeiro_pagamento: d.diaPrimeiroPagamento,
      politica_estorno: d.politicaEstorno,
      faixa_por_escritorio: opts.faixaPorEscritorio ?? false,
      ativa: true,
    })
    if (e2) return { ok: false, erro: 'Não foi possível salvar a política.' }

    await reconciliarCompetencias(supabase)
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro inesperado.' }
  }
}

/**
 * Desativa a política de um escopo. Quem dependia dela volta para a próxima
 * da fila — a geral, ou a config própria de cada corretor.
 */
export async function removerPoliticaEscritorio(aplicaA: string | null): Promise<Resultado> {
  try {
    const supabase = await createClient()
    const { data: escritorioId } = await supabase.rpc('meu_escritorio_como_dono')
    if (!escritorioId) return { ok: false, erro: ERROS.nao_e_dono }

    let q = supabase.from('config_financeira')
      .update({ ativa: false }).eq('ativa', true).eq('escritorio_id', escritorioId)
    q = aplicaA ? q.eq('aplica_a', aplicaA) : q.is('aplica_a', null)
    const { error } = await q
    if (error) return { ok: false, erro: 'Não foi possível remover a política.' }

    await reconciliarCompetencias(supabase)
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro inesperado.' }
  }
}

/**
 * Metas do mês: a da casa (corretorId nulo) e as por corretor, numa gravação
 * só. Apagar e reinserir em vez de upsert linha a linha — o formulário manda
 * o mês inteiro, e meta zerada/apagada é linha que deixa de existir.
 */
export async function salvarMetas(
  ano: number, mes: number,
  metas: { corretorId: string | null; valorCentavos: number }[],
): Promise<Resultado> {
  try {
    if (!Number.isInteger(ano) || !Number.isInteger(mes) || mes < 1 || mes > 12)
      return { ok: false, erro: 'Mês inválido.' }
    const supabase = await createClient()
    const { data: escritorioId } = await supabase.rpc('meu_escritorio_como_dono')
    if (!escritorioId) return { ok: false, erro: ERROS.nao_e_dono }

    const { error: e1 } = await supabase.from('metas_escritorio')
      .delete().eq('escritorio_id', escritorioId).eq('ano', ano).eq('mes', mes)
    if (e1) return { ok: false, erro: 'Não foi possível salvar as metas.' }

    const linhas = metas
      .filter(m => Number.isInteger(m.valorCentavos) && m.valorCentavos > 0)
      .map(m => ({
        escritorio_id: escritorioId, corretor_id: m.corretorId,
        ano, mes, valor_centavos: m.valorCentavos,
      }))
    if (linhas.length > 0) {
      const { error: e2 } = await supabase.from('metas_escritorio').insert(linhas)
      if (e2) return { ok: false, erro: 'Não foi possível salvar as metas.' }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro inesperado.' }
  }
}

