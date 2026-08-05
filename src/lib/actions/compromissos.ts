'use server'
import { createClient } from '@/lib/supabase/server'
import { compromissoFormSchema, type CompromissoForm } from '@/lib/domain/schemas'

/**
 * A agenda de compromissos.
 *
 * Casca fina sobre a tabela: quem protege é a RLS (`own rows`), e o
 * `corretor_id` vem da sessão, nunca do formulário. O `.eq('corretor_id')`
 * nos updates é cinto e suspensório — a policy já barraria, mas escrever a
 * condição deixa a intenção no código de quem lê.
 */

/** A linha existe, mas não é de quem pediu — ou já foi apagada em outra aba. */
const NAO_E_SEU = 'Este compromisso não está mais disponível.'

type Resultado<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true; dados: T })
  | { ok: false; erro: string }

/** Vazio não é zero nem string vazia: é a ausência de hora marcada. */
function limpar(input: CompromissoForm) {
  return {
    titulo: input.titulo.trim(),
    data: input.data,
    hora: input.hora?.trim() ? input.hora : null,
    cliente_id: input.clienteId ?? null,
    nota: (input.nota ?? '').trim(),
  }
}

export async function criarCompromisso(input: CompromissoForm): Promise<Resultado<{ id: string }>> {
  const parsed = compromissoFormSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, erro: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, erro: 'Sessão expirada. Entre novamente.' }

  const { data, error } = await supabase.from('compromissos')
    .insert({ corretor_id: user.id, ...limpar(parsed.data) })
    .select('id').single()
  if (error) return { ok: false, erro: 'Não foi possível salvar o compromisso.' }
  return { ok: true, dados: { id: data.id } }
}

export async function atualizarCompromisso(id: string, input: CompromissoForm): Promise<Resultado> {
  const parsed = compromissoFormSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false, erro: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, erro: 'Sessão expirada. Entre novamente.' }

  /*
   * `.select()` para saber se ALGUMA linha foi tocada.
   *
   * Update que não encontra linha não é erro no PostgREST: volta 200 com zero
   * linhas. Sem esta checagem, mexer num compromisso que a RLS não alcança
   * devolveria "salvo com sucesso" sem nada ter acontecido. Falha silenciosa é
   * pior que erro.
   */
  const { data, error } = await supabase.from('compromissos')
    .update(limpar(parsed.data)).eq('id', id).eq('corretor_id', user.id).select('id')
  if (error) return { ok: false, erro: 'Não foi possível atualizar o compromisso.' }
  if (!data?.length) return { ok: false, erro: NAO_E_SEU }
  return { ok: true }
}

/**
 * Marca como feito, ou desmarca.
 *
 * Guarda o instante, não um sim/não: "concluído" sem quando não deixa dizer
 * "feito ontem", e é isso que o corretor pergunta quando bate o olho na lista.
 */
export async function concluirCompromisso(id: string, feito: boolean): Promise<Resultado> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, erro: 'Sessão expirada. Entre novamente.' }

  const { data, error } = await supabase.from('compromissos')
    .update({ concluido_em: feito ? new Date().toISOString() : null })
    .eq('id', id).eq('corretor_id', user.id).select('id')
  if (error) return { ok: false, erro: 'Não foi possível atualizar o compromisso.' }
  if (!data?.length) return { ok: false, erro: NAO_E_SEU }
  return { ok: true }
}

export async function removerCompromisso(id: string): Promise<Resultado> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, erro: 'Sessão expirada. Entre novamente.' }

  const { data, error } = await supabase.from('compromissos')
    .delete().eq('id', id).eq('corretor_id', user.id).select('id')
  if (error) return { ok: false, erro: 'Não foi possível remover o compromisso.' }
  if (!data?.length) return { ok: false, erro: NAO_E_SEU }
  return { ok: true }
}
