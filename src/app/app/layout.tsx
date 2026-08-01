import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { Providers } from '@/components/providers'
import { AppNav } from '@/components/app-nav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: config } = await supabase.from('config_financeira')
    .select('id').eq('ativa', true).maybeSingle()
  const path = (await headers()).get('x-pathname') ?? ''
  // gate via página: onboarding/page redireciona de volta se config existe;
  // demais páginas: layout redireciona se falta config — usar cookie-free check:
  if (!config && !path.includes('onboarding')) redirect('/app/onboarding')
  return (
    <Providers>
      <AppNav />
      <main className="min-h-dvh pb-20 md:pb-8 md:pl-56">
        <div className="mx-auto max-w-3xl p-4">{children}</div>
      </main>
    </Providers>
  )
}
