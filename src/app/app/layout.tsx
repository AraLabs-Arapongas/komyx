import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Providers } from '@/components/providers'
import { AppNav } from '@/components/app-nav'
import { OnboardingWizard } from '@/components/onboarding-wizard'
import { PortaoAssinatura } from '@/components/portao-assinatura'
import { AvisoAssinatura } from '@/components/aviso-assinatura'
import { avaliarAcesso, temAvisoDeAssinatura } from '@/lib/assinatura/acesso'
import { stripeConfigurado } from '@/lib/stripe/servidor'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: config }, { data: perfil }] = await Promise.all([
    supabase.from('config_financeira').select('id').eq('ativa', true).maybeSingle(),
    supabase.from('profiles')
      .select('trial_termina_em, assinatura_status, assinatura_ate, cancela_no_fim')
      .eq('id', user.id).maybeSingle(),
  ])

  const acesso = avaliarAcesso(perfil)

  /*
   * Sem Stripe configurado o portão não fecha.
   *
   * É a escolha entre dar alguns dias de graça e trancar o corretor fora do
   * app numa tela cujo botão de pagar não funciona. O primeiro custa dinheiro;
   * o segundo custa o cliente.
   *
   * Em desenvolvimento ele fecha de qualquer jeito, senão a tela não teria
   * como ser testada antes de existirem chaves. A volta é o botão de bastidor
   * dentro do próprio portão — sem ele, simular o fim do teste trancaria o
   * menu que criou a situação.
   */
  const portaoVale = stripeConfigurado() || process.env.NODE_ENV !== 'production'
  if (!acesso.liberado && portaoVale) {
    return (
      <Providers>
        <PortaoAssinatura motivo={acesso.motivo} />
      </Providers>
    )
  }

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
      {/* só a altura do menu: o respiro de 1rem vem do p-4 do container abaixo.
          Somar os dois deixava 16px sobrando embaixo da barra de ação, que
          então não encostava no menu quando o formulário era longo. */}
      {/* desconta o cabeçalho: ele é sticky mas ocupa lugar no fluxo, então
            100dvh aqui deixava a página sempre 51px mais alta que a tela — a
            rolagem existia mesmo sem nada para rolar */}
      <main className="flex min-h-[calc(100dvh-var(--altura-cabecalho))] flex-col pb-[var(--altura-nav)] md:pb-8 md:pl-44">
        {/* flex-1: sem isto a coluna termina onde o conteúdo termina, e sobrava
            um resto da altura do main embaixo dela — a barra de ação dos
            formulários parava alguns pixels acima do menu */}
        {/*
          O atributo avisa o hero do painel que ele não é mais o primeiro
          elemento da tela. Ele sobe por baixo do cabeçalho transparente com
          margem negativa, e essa margem passaria por cima da tarja — a regra
          que desliga isso mora no globals.css, junto das outras da marca.
        */}
        <div data-com-aviso={temAvisoDeAssinatura(acesso) || undefined}
          className="mx-auto flex w-full max-w-3xl flex-1 flex-col p-4 md:p-6">
          {/* acima do conteúdo, e não dentro de cada tela: o aviso vale para o
              app inteiro e ele mesmo decide quando não tem nada a dizer */}
          <AvisoAssinatura acesso={acesso} />
          {children}
        </div>
      </main>
    </Providers>
  )
}
