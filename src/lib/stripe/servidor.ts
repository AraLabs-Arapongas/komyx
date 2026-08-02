import 'server-only'
import Stripe from 'stripe'

/**
 * O Stripe, do lado do servidor.
 *
 * A chave é lida na hora da chamada, e não no topo do módulo, porque este
 * arquivo é importado pelo layout do app — que roda no build. Ler no import
 * quebraria a compilação de qualquer ambiente sem as chaves configuradas, e é
 * exatamente esse o estado do projeto até alguém abrir a conta no Stripe.
 */

/**
 * Sem chave, não há como cobrar — e sem como cobrar, não se tranca ninguém.
 *
 * O portão do app consulta isto antes de bloquear: enquanto o Stripe não
 * estiver configurado, o fim do teste não fecha a porta. É a escolha
 * deliberada entre "usuário usa de graça alguns dias a mais" e "usuário fica
 * sem o app e sem nenhuma tela onde pagar".
 */
export function stripeConfigurado(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID)
}

let cliente: Stripe | null = null

export function stripe(): Stripe {
  const chave = process.env.STRIPE_SECRET_KEY
  if (!chave) throw new Error('STRIPE_SECRET_KEY não configurada')
  // uma instância por processo: o SDK guarda o pool de conexões dentro dela, e
  // com Fluid Compute o processo atende várias requisições
  if (!cliente) cliente = new Stripe(chave)
  return cliente
}

export function precoDaAssinatura(): string {
  const preco = process.env.STRIPE_PRICE_ID
  if (!preco) throw new Error('STRIPE_PRICE_ID não configurado')
  return preco
}

/**
 * Endereço de volta do checkout. A Vercel dá `VERCEL_PROJECT_PRODUCTION_URL`
 * de graça, mas ela aponta para o domínio da Vercel mesmo em produção — e o
 * corretor precisa voltar para komyx.com.br, com o cookie de sessão dele.
 */
export function enderecoDoSite(): string {
  const explicito = process.env.NEXT_PUBLIC_SITE_URL
  if (explicito) return explicito.replace(/\/$/, '')
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (vercel) return `https://${vercel}`
  return 'http://localhost:3000'
}
