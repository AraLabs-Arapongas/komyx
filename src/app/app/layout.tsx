import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Providers } from '@/components/providers'
import { AppNav } from '@/components/app-nav'
import { OnboardingWizard } from '@/components/onboarding-wizard'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: config } = await supabase.from('config_financeira')
    .select('id').eq('ativa', true).maybeSingle()

  /*
   * Sem configuração, o wizard OCUPA a rota em vez de redirecionar para uma
   * rota própria.
   *
   * O redirect custou dois bugs: qualquer prefetch de /app (os links do menu
   * disparam um) recebia o redirect, e a entrada de cache do router para /app
   * nunca era satisfeita — o Next repetia o pedido para sempre. A árvore
   * remontava a cada resposta, o estado do wizard voltava ao primeiro passo e
   * o botão "Continuar" parecia não funcionar. Só um refresh saía disso.
   *
   * Respondendo a própria página, o prefetch é satisfeito e o loop não existe.
   * A navegação continua fora daqui: sem config não há para onde ir.
   */
  if (!config) {
    return (
      <Providers>
        <main className="min-h-dvh">
          <div className="mx-auto max-w-3xl p-4"><OnboardingWizard /></div>
        </main>
      </Providers>
    )
  }

  return (
    <Providers>
      <AppNav />
      <main className="min-h-dvh pb-[calc(var(--altura-nav)+1rem)] md:pb-8 md:pl-44">
        <div className="mx-auto max-w-3xl p-4 md:p-6">{children}</div>
      </main>
    </Providers>
  )
}
