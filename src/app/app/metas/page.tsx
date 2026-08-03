import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina'
import { MetasDoCorretor } from '@/components/escritorio/metas-do-corretor'

/**
 * As metas do corretor, em página própria.
 *
 * Nasceram dentro de "Suas regras" e saíram de lá: regra é o que não muda —
 * quanto por faixa, quando fecha o mês — e meta é o número do mês corrente,
 * que se olha toda semana. Enterrar uma coisa que se consulta sempre dentro
 * de outra que se lê uma vez é escondê-la.
 *
 * Só para quem está em escritório: meta é definida pela casa, e quem vende
 * sozinho não tem quem a defina.
 */
export default async function MetasDoCorretorPage() {
  const supabase = await createClient()
  const { data } = await supabase.rpc('meu_escritorio')
  const papel = (data as { papel?: string } | null)?.papel
  // o dono tem a página dele, com as metas de todo mundo
  if (papel === 'dono') redirect('/app/escritorio/metas')
  if (!papel) redirect('/app/perfil')

  return (
    <div className="coluna-formulario space-y-6 md:min-h-0">
      <CabecalhoPagina voltarPara="/app/perfil" titulo="Metas"
        apoio="Quanto o escritório espera de você e da equipe neste mês." />
      <MetasDoCorretor />
    </div>
  )
}
