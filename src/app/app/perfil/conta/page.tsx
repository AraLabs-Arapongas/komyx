import { createClient } from '@/lib/supabase/server'
import { PerfilForm } from '@/components/perfil-form'
import { Voltar } from '@/components/voltar'

export default async function ContaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase.from('profiles')
    .select('nome, telefone').eq('id', user?.id ?? '').single()

  return (
    <div className="space-y-4">
      {/* sem h1: o cartão do PerfilForm já abre com o próprio título */}
      <Voltar href="/app/perfil" />
      <PerfilForm
        email={user?.email ?? ''}
        nome={perfil?.nome ?? ''}
        telefone={perfil?.telefone ?? ''}
      />
    </div>
  )
}
