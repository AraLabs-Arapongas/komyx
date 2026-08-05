/**
 * O plano, em um lugar só.
 *
 * O preço aparece na landing, no portão de fim de teste e na tela de
 * assinatura. Três textos soltos ficam desalinhados no dia do primeiro
 * reajuste — e o pior lugar para errar o preço é a página que pede o cartão.
 *
 * O valor de verdade, o que o cartão paga, é o do Stripe (`STRIPE_PRICE_ID`).
 * O que está aqui é o que o corretor lê; mudar um exige mudar o outro.
 */
export const PLANO = {
  nome: 'Komyx completo',
  precoCentavos: 1990,
  // moeda e valor separados porque a landing compõe os dois em tamanhos
  // diferentes; juntos viraria uma string que ninguém consegue estilizar
  moeda: 'R$',
  valor: '19,90',
  periodo: '/mês',
  diasDeTeste: 14,
} as const

/** o que entra na assinatura, na ordem em que o corretor liga para elas */
export const INCLUSO = [
  'Vendas, comissões e parcelas calculadas pelas regras do seu escritório',
  'Recebimentos: o que entra e quando, mês a mês',
  'Faixas retroativas por acumulado — inclusive quando uma venda muda o mês inteiro',
  'Conferência das cotas contra a Loteria Federal',
  'Seus dados exportáveis a qualquer momento',
]
