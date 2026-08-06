/**
 * Quem responde pelo Komyx, juridicamente.
 *
 * Num arquivo só porque os mesmos dados aparecem nos Termos, na Política de
 * Privacidade e em qualquer notificação futura — e um CNPJ divergente entre
 * duas páginas do próprio site é o tipo de detalhe que derruba a credibilidade
 * de tudo o que está escrito nelas.
 *
 * ⚠️ OS CAMPOS MARCADOS COM [ ] AINDA NÃO FORAM PREENCHIDOS. Enquanto
 * estiverem assim, as páginas legais aparecem com um aviso e NÃO devem ser
 * divulgadas: contrato de consumo sem identificação do fornecedor é o começo
 * errado de uma relação que se quer duradoura, além de exigência do CDC
 * (art. 31) e da LGPD (art. 41, o encarregado).
 */
export const EMPRESA = {
  nomeFantasia: 'Komyx',
  razaoSocial: '[RAZÃO SOCIAL]',
  cnpj: '[CNPJ]',
  endereco: '[ENDEREÇO COMPLETO]',
  /** para onde vai pedido de suporte, cancelamento e exercício de direitos */
  email: '[E-MAIL DE CONTATO]',
  /** LGPD art. 41: quem responde por pedidos de titulares */
  encarregado: '[NOME DO ENCARREGADO]',
  site: 'https://www.komyx.com.br',
} as const

/** Data em que o texto vigente passou a valer — muda quando o texto muda. */
export const VIGENCIA = '6 de agosto de 2026'

/** Falta preencher alguma coisa? A página avisa em vez de fingir que está pronta. */
export function faltaPreencher(): string[] {
  return Object.entries(EMPRESA)
    .filter(([, valor]) => valor.startsWith('['))
    .map(([campo]) => campo)
}
