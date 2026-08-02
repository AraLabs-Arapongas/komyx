import { createClient } from '@/lib/supabase/server'
import { PerfilForm } from '@/components/perfil-form'
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina'

export default async function ContaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase.from('profiles')
    .select('nome, telefone').eq('id', user?.id ?? '').single()

  return (
    <div className="space-y-4">
      <CabecalhoPagina voltarPara="/app/perfil" titulo="Conta"
        apoio="Seus dados de acesso e contato." />
      <PerfilForm
        email={user?.email ?? ''}
        nome={perfil?.nome ?? ''}
        telefone={perfil?.telefone ?? ''}
      />
    </div>
  )
}
