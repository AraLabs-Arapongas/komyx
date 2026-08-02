import { createClient } from '@/lib/supabase/server'
import { sair } from '@/app/(auth)/actions'
import { MenuPerfil } from '@/components/menu-perfil'
import { Button } from '@/components/ui/button'
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
  const { data: perfil } = await supabase.from('profiles')
    .select('nome').eq('id', user?.id ?? '').single()

  const nome = perfil?.nome?.trim() || 'Corretor'

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
      <MenuPerfil />

      <form action={sair}>
        <Button variant="outline" type="submit" className="w-full">Sair</Button>
      </form>
    </LayoutAba>
  )
}
