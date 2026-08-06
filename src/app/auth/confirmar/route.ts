import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export const runtime = 'nodejs'

/**
 * A porta por onde entra quem clicou num link de e-mail.
 *
 * O link do Supabase não abre o app direto: ele passa pelo servidor deles, que
 * devolve o navegador para cá com uma credencial de uso único. Aqui ela vira
 * sessão em cookie — só depois disso a pessoa consegue trocar a própria senha.
 *
 * Aceita os DOIS formatos de propósito. O `@supabase/ssr` usa PKCE e manda
 * `code`; os templates de e-mail que usam `{{ .TokenHash }}` mandam
 * `token_hash` + `type`. Qual dos dois chega depende de configuração no painel
 * do Supabase, e um handler que só entende um deles quebra no dia em que
 * alguém editar o template — com o sintoma pior possível: o corretor trancado
 * fora da conta, sem erro visível.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  /*
   * Para onde ir depois. Mesmo cuidado do login: só caminho interno, porque
   * "//outro-site.com" é URL absoluta para o navegador — e este link chega por
   * e-mail, que é justamente por onde um ataque de redirecionamento entraria.
   */
  const bruto = searchParams.get('proximo') ?? '/app'
  const proximo = bruto.startsWith('/') && !bruto.startsWith('//') ? bruto : '/app'

  const supabase = await createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(proximo, origin))
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) return NextResponse.redirect(new URL(proximo, origin))
  }

  /*
   * Link vencido, já usado, ou de outro navegador. Não diz qual dos três: para
   * quem está do lado de fora tentando adivinhar, os três são a mesma resposta.
   */
  return NextResponse.redirect(new URL(
    '/recuperar?erro=' + encodeURIComponent(
      'Este link não vale mais. Peça um novo abaixo.'), origin))
}
