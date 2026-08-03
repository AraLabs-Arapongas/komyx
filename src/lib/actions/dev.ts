'use server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

const DIA = 24 * 60 * 60 * 1000

/*
 * Os estados de assinatura que valem a pena ver com os próprios olhos.
 *
 * Cada um existe porque tem tela própria: a tarja do fim do teste, o portão, o
 * aviso de cobrança recusada, a tela de quem paga. Esperar quatorze dias para
 * conferir um deles não é teste, é sorte.
 */
export type EstadoSimulado =
  | 'teste_cheio' | 'teste_acabando' | 'teste_acabou'
  | 'assinante' | 'cobranca_falhou' | 'assinatura_acabou'

function comoFica(estado: EstadoSimulado) {
  const agora = Date.now()
  const emDias = (n: number) => new Date(agora + n * DIA).toISOString()
  const semAssinatura = {
    stripe_customer_id: null, stripe_subscription_id: null,
    assinatura_status: null, assinatura_ate: null, cancela_no_fim: false,
  }
  /* o cliente do Stripe é o que faz o botão do portal aparecer na tela de
     assinatura; sem ele a simulação mostraria meia tela */
  const comCliente = { stripe_customer_id: 'cus_simulado', stripe_subscription_id: 'sub_simulada' }
  switch (estado) {
    case 'teste_cheio':
      return { trial_termina_em: emDias(14), ...semAssinatura }
    case 'teste_acabando':
      return { trial_termina_em: emDias(2), ...semAssinatura }
    case 'teste_acabou':
      return { trial_termina_em: emDias(-1), ...semAssinatura }
    case 'assinante':
      return {
        trial_termina_em: emDias(-20), assinatura_status: 'active',
        assinatura_ate: emDias(30), cancela_no_fim: false, ...comCliente,
      }
    case 'cobranca_falhou':
      return {
        trial_termina_em: emDias(-20), assinatura_status: 'past_due',
        assinatura_ate: emDias(-2), cancela_no_fim: false, ...comCliente,
      }
    case 'assinatura_acabou':
      return {
        trial_termina_em: emDias(-20), assinatura_status: 'canceled',
        assinatura_ate: emDias(-2), cancela_no_fim: false, ...comCliente,
      }
  }
}

/**
 * Põe a conta em um estado de assinatura, para ver a tela que ele produz.
 *
 * Escreve pela chave de serviço porque é exatamente isto que a migração 0014
 * proíbe o corretor de fazer sozinho — as colunas de cobrança não são dele. A
 * trava vale; o bastidor passa por cima dela em desenvolvimento, de propósito,
 * e o `foraDeDesenvolvimento` acima é o que separa uma coisa da outra.
 */
export async function simularAssinatura(estado: EstadoSimulado) {
  if (foraDeDesenvolvimento())
    return { ok: false as const, erro: 'Disponível apenas em desenvolvimento.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, erro: 'Sessão expirada. Entre novamente.' }

  try {
    const admin = createAdminClient()
    const { error } = await admin.from('profiles').update(comoFica(estado)).eq('id', user.id)
    if (error) return { ok: false as const, erro: error.message }
    return { ok: true as const }
  } catch (e) {
    // sem SUPABASE_SERVICE_ROLE_KEY no .env.local não dá para escrever aqui
    return { ok: false as const, erro: e instanceof Error ? e.message : 'Erro inesperado.' }
  }
}
