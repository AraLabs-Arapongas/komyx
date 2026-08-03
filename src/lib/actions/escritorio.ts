'use server'
import { createClient } from '@/lib/supabase/server'

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
