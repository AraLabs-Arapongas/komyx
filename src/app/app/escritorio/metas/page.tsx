import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina'
import { MetasEscritorio } from '@/components/escritorio/metas'

/** Metas do mês — a da casa e as por corretor. Só o dono. */
export default async function MetasPage() {
  const supabase = await createClient()
  const { data: escritorioId } = await supabase.rpc('meu_escritorio_como_dono')
  if (!escritorioId) redirect('/app/escritorio')

  const { data: membros } = await supabase.rpc('membros_do_escritorio')
  const ativos = (membros ?? [])
    .filter(m => !m.saiu_em)
    .map(m => ({ corretorId: m.corretor_id, nome: m.nome }))

  return (
    <div className="coluna-formulario space-y-6 md:min-h-0">
      <CabecalhoPagina voltarPara="/app/escritorio" titulo="Metas"
        apoio="Quanto o escritório e cada corretor devem vender."
        aviso="A meta vale do mês em que começa até a próxima vigência. Assim você define uma vez e só volta aqui quando o número mudar — e o histórico continua medido pela meta que valia em cada mês." />
      <MetasEscritorio membros={ativos} />
    </div>
  )
}
