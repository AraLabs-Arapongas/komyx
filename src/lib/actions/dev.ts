'use server'
import { createClient } from '@/lib/supabase/server'

/**
 * Ações de bastidor, para testar fluxos sem recriar conta.
 *
 * Cada uma checa o ambiente por conta própria: esconder o menu no cliente não
 * protege nada, a action continua sendo um endpoint que qualquer um pode
 * chamar. Em produção elas recusam.
 */
function foraDeDesenvolvimento(): boolean {
  return process.env.NODE_ENV === 'production'
}

/**
 * Devolve o corretor ao onboarding: desativa a configuração em vez de apagar.
 *
 * As competências já fechadas guardam o snapshot da config que usaram, então
 * apagar a linha levaria junto o histórico de como cada mês foi calculado.
 * Desativando, o layout volta a mostrar o wizard e o passado continua de pé.
 */
export async function refazerOnboarding() {
  if (foraDeDesenvolvimento())
    return { ok: false as const, erro: 'Disponível apenas em desenvolvimento.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, erro: 'Sessão expirada. Entre novamente.' }

  const { error } = await supabase.from('config_financeira')
    .update({ ativa: false }).eq('ativa', true)
  if (error) return { ok: false as const, erro: 'Não foi possível desativar a configuração.' }
  return { ok: true as const }
}
