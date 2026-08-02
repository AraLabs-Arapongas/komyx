'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe, precoDaAssinatura, enderecoDoSite, stripeConfigurado } from '@/lib/stripe/servidor'

/** o Stripe exige pelo menos 48h de teste restante para respeitá-lo */
const MINIMO_DE_TESTE_MS = 49 * 60 * 60 * 1000

const VOLTA = '/app/perfil/assinatura'

type Falha = { ok: false; erro: string }

async function corretorAtual() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: perfil } = await supabase.from('profiles')
    .select('nome, trial_termina_em, stripe_customer_id')
    .eq('id', user.id).single()
  return { user, perfil }
}

/**
 * Garante um cliente no Stripe para este corretor e devolve o id.
 *
 * A gravação sai pela chave de serviço porque `stripe_customer_id` é coluna
 * que o corretor não pode escrever — é a mesma trava que impede alguém de se
 * declarar assinante por um PATCH no PostgREST.
 */
async function clienteNoStripe(
  userId: string, email: string | undefined, nome: string | null, existente: string | null,
): Promise<string> {
  if (existente) return existente
  const cliente = await stripe().customers.create({
    email,
    name: nome?.trim() || undefined,
    // o webhook usa isto quando o evento não traz o corretor por outro caminho
    metadata: { corretor_id: userId },
  })
  const admin = createAdminClient()
  const { error } = await admin.from('profiles')
    .update({ stripe_customer_id: cliente.id }).eq('id', userId)
  // Se a gravação falhar depois do cliente criado, a próxima tentativa cria
  // outro cliente no Stripe. Duplicata é bagunça, não é cobrança dobrada — e
  // é melhor que abortar o checkout de quem está com o cartão na mão.
  if (error) console.error('[assinatura] não gravei o customer do Stripe:', error.message)
  return cliente.id
}

/**
 * Leva o corretor ao checkout do Stripe.
 *
 * Devolve erro em vez de redirecionar quando algo falta; a tela mostra a
 * mensagem e o corretor continua onde estava, em vez de cair numa página de
 * erro do Stripe sem saber o que aconteceu.
 */
export async function abrirCheckout(): Promise<Falha | never> {
  let destino: string
  try {
    if (!stripeConfigurado()) {
      return { ok: false, erro: 'O pagamento ainda não está disponível. Tente mais tarde.' }
    }
    const atual = await corretorAtual()
    if (!atual) return { ok: false, erro: 'Sessão expirada. Entre novamente.' }
    const { user, perfil } = atual

    const customer = await clienteNoStripe(
      user.id, user.email, perfil?.nome ?? null, perfil?.stripe_customer_id ?? null)

    /*
     * Quem assina no terceiro dia não perde os onze que faltam: o teste que já
     * estava correndo aqui vira o `trial_end` da assinatura lá. Sem isto,
     * assinar antes da hora seria punido com uma cobrança adiantada — e o
     * corretor aprenderia a esperar o último dia.
     */
    const fimDoTeste = perfil?.trial_termina_em ? new Date(perfil.trial_termina_em) : null
    const restante = fimDoTeste ? fimDoTeste.getTime() - Date.now() : 0
    const trial_end = restante > MINIMO_DE_TESTE_MS
      ? Math.floor(fimDoTeste!.getTime() / 1000)
      : undefined

    const sessao = await stripe().checkout.sessions.create({
      mode: 'subscription',
      customer,
      client_reference_id: user.id,
      line_items: [{ price: precoDaAssinatura(), quantity: 1 }],
      subscription_data: { metadata: { corretor_id: user.id }, ...(trial_end ? { trial_end } : {}) },
      allow_promotion_codes: true,
      locale: 'pt-BR',
      success_url: `${enderecoDoSite()}${VOLTA}?assinou=1`,
      cancel_url: `${enderecoDoSite()}${VOLTA}`,
    })
    if (!sessao.url) return { ok: false, erro: 'O Stripe não devolveu o endereço do pagamento.' }
    destino = sessao.url
  } catch (e) {
    console.error('[assinatura] checkout falhou:', e)
    return { ok: false, erro: 'Não foi possível abrir o pagamento. Tente novamente.' }
  }
  // fora do try: `redirect` funciona lançando, e o catch acima engoliria
  redirect(destino)
}

/**
 * Abre o portal do Stripe, onde o corretor troca o cartão, baixa a nota e
 * cancela. Nada disso mora aqui de propósito — reimplementar cobrança é
 * assumir a responsabilidade de acertar em todos os casos de borda.
 */
export async function abrirPortal(): Promise<Falha | never> {
  let destino: string
  try {
    if (!stripeConfigurado()) {
      return { ok: false, erro: 'O portal de pagamento ainda não está disponível.' }
    }
    const atual = await corretorAtual()
    if (!atual) return { ok: false, erro: 'Sessão expirada. Entre novamente.' }
    const customer = atual.perfil?.stripe_customer_id
    if (!customer) return { ok: false, erro: 'Você ainda não tem uma assinatura.' }

    const sessao = await stripe().billingPortal.sessions.create({
      customer,
      locale: 'pt-BR',
      return_url: `${enderecoDoSite()}${VOLTA}`,
    })
    destino = sessao.url
  } catch (e) {
    console.error('[assinatura] portal falhou:', e)
    return { ok: false, erro: 'Não foi possível abrir o portal. Tente novamente.' }
  }
  redirect(destino)
}
