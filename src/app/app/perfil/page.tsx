import { createClient } from '@/lib/supabase/server'
import { configEfetiva } from '@/lib/actions/recalcular'
import { MenuPerfil } from '@/components/menu-perfil'
import { BotaoSair } from '@/components/botao-sair'
import { LayoutAba } from '@/components/ui/layout-aba'
import { AvatarInicial } from '@/components/ui/avatar-inicial'

/**
 * Índice do perfil: quem é o corretor no topo, e abaixo as áreas que não são
 * o dia a dia do produto. Ajustes é uma delas — o que abre espaço para as
 * próximas (relatórios) sem disputar lugar na navegação de baixo.
 */
export default async function PerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  /*
   * A config efetiva decide o nome do primeiro item do menu.
   *
   * É a MESMA pergunta que a página de destino faz — sob política de
   * escritório ela vira ficha de leitura. Perguntar o vínculo aqui e a
   * política lá deixaria o menu prometer "Ajustes" para quem abre uma tela
   * sem nada a ajustar: um escritório sem política definida ainda deixa cada
   * corretor com as regras dele.
   */
  const [{ data: perfil }, efetiva, { data: vinculo }] = await Promise.all([
    supabase.from('profiles').select('nome').eq('id', user?.id ?? '').single(),
    configEfetiva(supabase),
    supabase.rpc('meu_escritorio'),
  ])

  const nome = perfil?.nome?.trim() || 'Corretor'
  const papel = (vinculo as { papel?: string } | null)?.papel

  return (
    <LayoutAba
      titulo="Perfil"
      resumo={
        <div className="flex items-center gap-3">
          {/* o avatar é o mesmo das listas: o corretor se reconhece do mesmo
              jeito que reconhece os clientes dele */}
          <AvatarInicial nome={nome} className="size-11 bg-white/15 text-base text-white" />
          <div className="min-w-0">
            <p className="truncate font-semibold">{nome}</p>
            <p className="truncate text-sm text-white/75">{user?.email}</p>
          </div>
        </div>
      }
    >
      <MenuPerfil politicaDoEscritorio={efetiva?.escritorio_id != null}
        ehMembro={papel === 'corretor'} />

      {/* mesma confirmação do ícone da barra superior: dois caminhos para a
          mesma saída, uma pergunta só */}
      <BotaoSair variante="botao" />
    </LayoutAba>
  )
}
