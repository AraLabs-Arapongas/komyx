import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Agenda } from '@/components/agenda/agenda'

/**
 * A agenda de compromissos — a de tarefas, não a de dinheiro.
 *
 * O dono lê a da equipe pela RLS: a consulta é a mesma do corretor, e quem
 * decide o que entra é a policy. O que o servidor manda para cá é só o de-para
 * de nome, porque `profiles` não tem policy de leitura para o dono (nem vai
 * ter: ali moram as colunas de cobrança de cada um).
 */
export default async function AgendaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: vinculo } = await supabase.rpc('meu_escritorio')
  const ehDono = (vinculo as { papel?: string } | null)?.papel === 'dono'

  const { data: membros } = ehDono
    ? await supabase.rpc('membros_do_escritorio')
    : { data: null }

  const equipe = (membros ?? [])
    .filter(m => !m.saiu_em)
    .map(m => ({ corretorId: m.corretor_id, nome: m.nome }))

  return <Agenda euId={user.id} membros={equipe} ehDono={ehDono} />
}
