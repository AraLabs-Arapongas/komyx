import type { CookieOptions } from '@supabase/ssr'

/** Guarda a escolha do "manter conectado" feita na tela de login. */
export const COOKIE_LEMBRAR = 'cp-lembrar'

/**
 * Sem "manter conectado", os cookies de autenticação perdem validade fixa e
 * viram cookies de sessão: a conta sai sozinha quando o navegador fecha.
 * Com a opção marcada (padrão), a validade original do Supabase é mantida.
 */
export function validadeDaSessao(options: CookieOptions, lembrar: boolean): CookieOptions {
  if (lembrar) return options
  const semValidade = { ...options }
  delete semValidade.maxAge
  delete semValidade.expires
  return semValidade
}

export function querLembrar(valorDoCookie: string | undefined): boolean {
  return valorDoCookie !== '0'
}
