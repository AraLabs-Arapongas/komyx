'use server'
import { createClient } from '@/lib/supabase/server'
import { clienteFormSchema, type ClienteForm } from '@/lib/domain/schemas'

export async function criarCliente(input: ClienteForm & { email?: string; cidade?: string }) {
  const { email, cidade, ...resto } = input
  const parsed = clienteFormSchema.safeParse(resto)
  if (!parsed.success)
    return { ok: false as const, erro: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, erro: 'Sessão expirada. Entre novamente.' }
  const { data, error } = await supabase.from('clientes')
    .insert({ corretor_id: user.id, ...parsed.data, email: email ?? '', cidade: cidade ?? '' })
    .select('id').single()
  if (error) return { ok: false as const, erro: 'Não foi possível salvar o cliente.' }
  return { ok: true as const, id: data.id }
}

export async function atualizarCliente(id: string, input: ClienteForm & { email?: string; cidade?: string }) {
  const { email, cidade, ...resto } = input
  const parsed = clienteFormSchema.safeParse(resto)
  if (!parsed.success)
    return { ok: false as const, erro: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, erro: 'Sessão expirada. Entre novamente.' }
  const { error } = await supabase.from('clientes')
    .update({ ...parsed.data, email: email ?? '', cidade: cidade ?? '' })
    .eq('id', id).eq('corretor_id', user.id)
  if (error) return { ok: false as const, erro: 'Não foi possível atualizar o cliente.' }
  return { ok: true as const }
}
