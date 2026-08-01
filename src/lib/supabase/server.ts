import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './database.types'
import { COOKIE_LEMBRAR, querLembrar, validadeDaSessao } from './sessao'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) => {
          // lido aqui, e não fora, para enxergar a preferência que a própria
          // ação de login acabou de gravar nesta mesma requisição
          const lembrar = querLembrar(cookieStore.get(COOKIE_LEMBRAR)?.value)
          cs.forEach(({ name, value, options }) => {
            try { cookieStore.set(name, value, validadeDaSessao(options, lembrar)) } catch {}
          })
        },
      },
    },
  )
}
