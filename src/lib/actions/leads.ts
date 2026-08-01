'use server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const leadSchema = z.object({
  email: z.email('Informe um e-mail válido.').max(200),
  origem: z.string().max(40).default('landing'),
})

/**
 * Guarda o e-mail de quem veio pela landing e ainda não criou conta.
 *
 * Endpoint público por natureza — a página é aberta. A validação é o que
 * protege: e-mail bem formado e tamanho limitado. Um e-mail repetido não vira
 * erro para o visitante; do lado dele, deixar o contato duas vezes deu certo
 * nas duas.
 */
export async function registrarLead(input: { email: string; origem?: string }) {
  const parsed = leadSchema.safeParse({ email: input.email?.trim(), origem: input.origem })
  if (!parsed.success)
    return { ok: false as const, erro: parsed.error.issues[0]?.message ?? 'E-mail inválido.' }

  const supabase = await createClient()
  const { error } = await supabase.from('leads').insert(parsed.data)

  // 23505 = violação de índice único: o e-mail já está na lista
  if (error && error.code !== '23505')
    return { ok: false as const, erro: 'Não foi possível registrar agora. Tente de novo.' }

  return { ok: true as const }
}
