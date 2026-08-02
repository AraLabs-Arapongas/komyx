import 'server-only'
import { createClient as criarClienteSupabase } from '@supabase/supabase-js'
import type { Database } from './database.types'

/**
 * Cliente com a chave de serviço: passa por cima de RLS.
 *
 * Existe por um caso só — o webhook do Stripe. Ele chega sem cookie, sem
 * sessão e sem usuário; o `auth.uid()` de que toda política deste banco
 * depende é nulo lá dentro. Sem esta chave, a confirmação de pagamento não
 * consegue escrever na linha de ninguém.
 *
 * Não use em nada que nasça de um clique do corretor. Ali o cliente normal
 * serve, e é ele que garante que uma requisição só mexa nos dados de quem a
 * fez. Aqui essa garantia não existe: o filtro por dono é responsabilidade de
 * quem escreve a query.
 */
export function createAdminClient() {
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!chave) throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada')
  return criarClienteSupabase<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    chave,
    // sem sessão para persistir nem token para renovar: é um processo de
    // servidor atendendo uma requisição e morrendo
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
