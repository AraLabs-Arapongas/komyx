import { createClient } from '@/lib/supabase/server'
import { sair } from '@/app/(auth)/actions'
import { MenuPerfil } from '@/components/menu-perfil'
import { Button } from '@/components/ui/button'

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
  const inicial = nome[0]?.toUpperCase() ?? 'C'

  return (
    <div className="space-y-4">
      <section className="entra flex items-center gap-3 rounded-2xl bg-escuro p-5 text-white">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full
                         bg-white/10 text-lg font-semibold">
          {inicial}
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{nome}</p>
          <p className="truncate text-sm text-escuro-texto">{user?.email}</p>
        </div>
      </section>

      <MenuPerfil />

      <form action={sair}>
        <Button variant="outline" type="submit" className="w-full">Sair</Button>
      </form>
    </div>
  )
}
