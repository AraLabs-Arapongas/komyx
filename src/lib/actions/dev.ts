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

/** Uma conta do banco local, para o atalho de login em desenvolvimento. */
export type ContaDeTeste = {
  email: string
  nome: string
  /** 'dono' | 'corretor' quando faz parte de um escritório */
  papel: string | null
  escritorio: string | null
}

/**
 * As contas do banco local, para não precisar decorar e-mail de teste.
 *
 * Não exige sessão — quem chama está justamente na tela de login. O que
 * protege é o `foraDeDesenvolvimento` logo abaixo: em produção esta função
 * devolve lista vazia antes de tocar no banco, e a chave de serviço nunca
 * chega perto de um cliente de verdade.
 *
 * Devolve e-mail e papel, nunca senha: o atalho preenche o e-mail e a senha
 * padrão do seed, e quem tiver outra digita.
 */
export async function contasDeTeste(): Promise<ContaDeTeste[]> {
  if (foraDeDesenvolvimento()) return []
  try {
    const admin = createAdminClient()
    const { data, error } = await admin.auth.admin.listUsers({ perPage: 50 })
    if (error) return []

    const ids = data.users.map(u => u.id)
    const [{ data: perfis }, { data: vinculos }] = await Promise.all([
      admin.from('profiles').select('id, nome').in('id', ids),
      admin.from('membros_escritorio')
        .select('corretor_id, papel, escritorios(nome)').is('saiu_em', null),
    ])

    const nomes = new Map((perfis ?? []).map(p => [p.id, p.nome]))
    const equipe = new Map((vinculos ?? []).map(v => [v.corretor_id, {
      papel: v.papel,
      escritorio: (v.escritorios as { nome: string } | null)?.nome ?? null,
    }]))

    return data.users
      .filter(u => u.email)
      .map(u => ({
        email: u.email!,
        nome: nomes.get(u.id)?.trim() || u.email!.split('@')[0],
        papel: equipe.get(u.id)?.papel ?? null,
        escritorio: equipe.get(u.id)?.escritorio ?? null,
      }))
      // dono primeiro: é a conta que se quer testar mais vezes
      .sort((a, b) => (a.papel === 'dono' ? -1 : b.papel === 'dono' ? 1 : 0))
  } catch {
    return []
  }
}

