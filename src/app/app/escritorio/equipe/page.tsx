import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina'
import { Equipe } from '@/components/escritorio/equipe'

/**
 * A equipe do escritório, só para o dono. Quem não é cai de volta na área do
 * escritório, que sabe o que mostrar para cada papel.
 */
export default async function EquipePage() {
  const supabase = await createClient()
  const { data: escritorioId } = await supabase.rpc('meu_escritorio_como_dono')
  if (!escritorioId) redirect('/app/escritorio')

  return (
    <div className="space-y-4">
      <CabecalhoPagina voltarPara="/app/escritorio" titulo="Equipe"
        apoio="Convide corretores e cuide de quem entra e sai." />
      <Equipe />
    </div>
  )
}
