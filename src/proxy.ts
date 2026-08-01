import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { COOKIE_LEMBRAR, querLembrar, validadeDaSessao } from '@/lib/supabase/sessao'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  const lembrar = querLembrar(request.cookies.get(COOKIE_LEMBRAR)?.value)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cs) => {
          cs.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cs.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, validadeDaSessao(options, lembrar)))
        },
      },
    },
  )
  const { data: { user } } = await supabase.auth.getUser()
  const isApp = request.nextUrl.pathname.startsWith('/app')
  if (isApp && !user) return NextResponse.redirect(new URL('/login', request.url))
  return response
}

export const config = { matcher: ['/app/:path*', '/login', '/cadastro'] }
