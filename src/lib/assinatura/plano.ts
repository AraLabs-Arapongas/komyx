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
  'Agenda do que entra e quando, mês a mês',
  'Faixas retroativas por acumulado — inclusive quando uma venda muda o mês inteiro',
  'Conferência das cotas contra a Loteria Federal',
  'Seus dados exportáveis a qualquer momento',
]

/**
 * O plano do outro lado do balcão.
 *
 * O Komyx individual responde "quanto EU recebo". O escritório tem a pergunta
 * inversa — quanto a equipe produziu, quanto sai de repasse, quem está perto
 * de virar de faixa — e ela não cabe numa conta de corretor.
 *
 * ⚠️ NÃO EXISTE AINDA. Nenhuma linha deste módulo foi escrita. A landing fala
 * dele como lista de espera, e é assim que precisa continuar até existir:
 * vender data de entrega de software que ainda não começou é a promessa mais
 * fácil de quebrar. Enquanto `precoAte` for nulo, nada de preço na página.
 */
export const PLANO_ESCRITORIO = {
  nome: 'Komyx Enterprise',
  chamada: 'Para o escritório e a equipe dele',
  /** sem preço enquanto não houver produto para cobrar */
  preco: 'Sob medida',
  /*
   * Não é o individual multiplicado por corretor: é mais caro, e o que
   * justifica está na frase — o dono passa a enxergar a produção de cada um
   * direto no painel dele, que é exatamente o que a conta individual não
   * entrega a ninguém.
   */
  apoio: 'O escritório inteiro num painel só, com os números de cada corretor.',
} as const

export const INCLUSO_ESCRITORIO = [
  'Tudo do plano individual, para cada corretor da equipe',
  'Painel do escritório: produção do mês por corretor, administradora e produto',
  'As políticas de comissão configuradas pelo escritório: uma para todos ou uma para cada corretor',
  'Contas com permissão: o corretor vê as vendas dele, o dono vê o negócio inteiro',
  'Metas por corretor e o acumulado que faz o escritório subir de faixa',
  'Entrada e saída de gente sem perder o histórico de quem saiu',
]
