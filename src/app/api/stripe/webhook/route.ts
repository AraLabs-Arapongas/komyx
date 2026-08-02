import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe/servidor'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * O que o Stripe conta para o Komyx.
 *
 * É o único caminho pelo qual o banco fica sabendo que alguém pagou. O
 * checkout redireciona o corretor de volta com `?assinou=1`, mas isso é só um
 * texto na barra de endereço: quem fecha o navegador antes de voltar pagou do
 * mesmo jeito, e quem digita o parâmetro na mão não pagou nada. O webhook é o
 * que o Stripe garante entregar.
 *
 * Precisa do corpo cru para conferir a assinatura, então nada de `req.json()`
 * aqui — o texto exato que chegou, byte a byte.
 */

// a verificação de assinatura usa crypto do Node, e o SDK do Stripe não roda
// no runtime edge
export const runtime = 'nodejs'

/** o que a gente guarda de uma assinatura do Stripe */
function espelhoDaAssinatura(assinatura: Stripe.Subscription) {
  /*
   * `current_period_end` saiu da assinatura e foi para os itens dela na API de
   * 2025 — no objeto raiz o campo simplesmente não existe mais. Sem uma
   * assinatura de vários itens no produto, o primeiro item é o período.
   */
  const fimDoPeriodo = assinatura.items.data[0]?.current_period_end
  const customer = typeof assinatura.customer === 'string'
    ? assinatura.customer : assinatura.customer?.id
  return {
    // regravado a cada evento de propósito: sem ele o corretor fica assinante
    // sem portal, e sem portal não há como trocar o cartão nem cancelar
    ...(customer ? { stripe_customer_id: customer } : {}),
    stripe_subscription_id: assinatura.id,
    assinatura_status: assinatura.status,
    assinatura_ate: fimDoPeriodo ? new Date(fimDoPeriodo * 1000).toISOString() : null,
    cancela_no_fim: assinatura.cancel_at_period_end,
  }
}

/**
 * De quem é esta assinatura.
 *
 * Três caminhos porque os eventos não trazem todos os campos: o metadata é o
 * que a gente mesmo carimbou no checkout, o customer é o vínculo que sobrevive
 * a qualquer alteração feita pelo painel do Stripe.
 */
async function acharCorretor(
  admin: ReturnType<typeof createAdminClient>,
  assinatura: Stripe.Subscription,
): Promise<string | null> {
  const carimbado = assinatura.metadata?.corretor_id
  if (carimbado) return carimbado

  const customer = typeof assinatura.customer === 'string'
    ? assinatura.customer : assinatura.customer?.id
  if (!customer) return null

  const { data } = await admin.from('profiles')
    .select('id').eq('stripe_customer_id', customer).maybeSingle()
  return data?.id ?? null
}

export async function POST(req: Request) {
  const assinaturaDoStripe = req.headers.get('stripe-signature')
  const segredo = process.env.STRIPE_WEBHOOK_SECRET
  if (!assinaturaDoStripe || !segredo) {
    console.error('[stripe] webhook sem assinatura ou sem STRIPE_WEBHOOK_SECRET')
    return new Response('sem assinatura', { status: 400 })
  }

  const corpo = await req.text()
  let evento: Stripe.Event
  try {
    // a versão async usa WebCrypto: é a que funciona fora do Node clássico e
    // não bloqueia o event loop
    evento = await stripe().webhooks.constructEventAsync(corpo, assinaturaDoStripe, segredo)
  } catch (e) {
    // aqui é 400 de propósito: assinatura inválida é alguém batendo na porta,
    // não um erro nosso, e o Stripe não deve reentregar
    console.error('[stripe] assinatura do webhook não confere:', e)
    return new Response('assinatura inválida', { status: 400 })
  }

  const admin = createAdminClient()

  /*
   * Idempotência antes de qualquer efeito. O Stripe reentrega o mesmo evento
   * quando a resposta demora ou falha, e a chave primária da tabela é o id
   * dele — a segunda entrega esbarra no conflito e sai por aqui.
   */
  const { error: jaVeio } = await admin.from('eventos_stripe')
    .insert({ id: evento.id, tipo: evento.type })
  if (jaVeio) {
    if (jaVeio.code === '23505') return Response.json({ repetido: true })
    console.error('[stripe] não registrei o evento:', jaVeio.message)
    // 500 para o Stripe tentar de novo: sem o registro, não há garantia de
    // idempotência, e aplicar às cegas é pior que reprocessar
    return new Response('erro ao registrar', { status: 500 })
  }

  try {
    await aplicar(admin, evento)
  } catch (e) {
    const erro = e instanceof Error ? e.message : String(e)
    console.error('[stripe] falhei ao aplicar', evento.type, erro)
    await admin.from('eventos_stripe').update({ erro }).eq('id', evento.id)
    // deixa o Stripe reentregar; o registro fica com o motivo para quando
    // alguém perguntar "paguei e não liberou"
    return new Response('erro ao aplicar', { status: 500 })
  }

  return Response.json({ ok: true })
}

async function aplicar(admin: ReturnType<typeof createAdminClient>, evento: Stripe.Event) {
  switch (evento.type) {
    /*
     * O ciclo inteiro cabe nestes três: criada, mudou, morreu. Pagamento
     * recusado e renovação bem-sucedida chegam como `updated` com o status
     * novo, então não há nada a fazer com os eventos de fatura.
     */
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const assinatura = evento.data.object
      const corretorId = await acharCorretor(admin, assinatura)
      if (!corretorId) {
        // cliente do Stripe sem perfil aqui: pode ser um teste feito pelo
        // painel. Registra e segue, sem 500 — reentregar não vai achar dono.
        await admin.from('eventos_stripe')
          .update({ erro: 'assinatura sem corretor correspondente' }).eq('id', evento.id)
        return
      }
      const { error } = await admin.from('profiles')
        .update(espelhoDaAssinatura(assinatura)).eq('id', corretorId)
      if (error) throw new Error(error.message)
      await admin.from('eventos_stripe').update({ corretor_id: corretorId }).eq('id', evento.id)
      return
    }

    /*
     * O checkout só serve para amarrar o cliente do Stripe ao corretor quando
     * a assinatura foi criada por fora do nosso fluxo. O estado em si vem do
     * `subscription.created`, que chega junto.
     */
    case 'checkout.session.completed': {
      const sessao = evento.data.object
      const corretorId = sessao.client_reference_id
      const customer = typeof sessao.customer === 'string' ? sessao.customer : sessao.customer?.id
      if (!corretorId || !customer) return
      const { error } = await admin.from('profiles')
        .update({ stripe_customer_id: customer }).eq('id', corretorId)
      if (error) throw new Error(error.message)
      await admin.from('eventos_stripe').update({ corretor_id: corretorId }).eq('id', evento.id)
      return
    }

    default:
      // os outros eventos ficam registrados na tabela e não fazem nada; é de
      // propósito, para o histórico existir sem virar código morto
      return
  }
}
