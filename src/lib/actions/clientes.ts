'use server'
import { createClient } from '@/lib/supabase/server'
import { clienteFormSchema, type ClienteForm } from '@/lib/domain/schemas'

export async function criarCliente(input: ClienteForm) {
  const parsed = clienteFormSchema.safeParse(input)
  if (!parsed.success)
    return { ok: false as const, erro: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, erro: 'Sessão expirada. Entre novamente.' }
  const { data, error } = await supabase.from('clientes')
    .insert({ corretor_id: user.id, ...parsed.data }).select('id').single()
  if (error) return { ok: false as const, erro: 'Não foi possível salvar o cliente.' }
  return { ok: true as const, id: data.id }
}
