import { createClient } from '@/lib/supabase/server'
import { PainelDoCorretor } from '@/components/painel-do-corretor'
import { PainelDoDono } from '@/components/escritorio/painel-do-dono'

/**
 * A porta do app, e ela abre em dois lugares diferentes.
 *
 * O corretor entra para ver quanto vai receber; o dono de escritório entra
 * para ver como a equipe está vendendo. São perguntas sem interseção, então
 * são telas sem interseção — e a escolha acontece no servidor, para ninguém
 * ver o painel errado piscar antes do certo.
 */
export default async function AppPage() {
  const supabase = await createClient()
  const { data } = await supabase.rpc('meu_escritorio')
  const vinculo = data as {
    nome: string
    papel: 'dono' | 'corretor'
    assinatura_status: 'ativa' | 'encerrada' | null
  } | null

  if (vinculo?.papel === 'dono') {
    return <PainelDoDono nomeEscritorio={vinculo.nome} status={vinculo.assinatura_status} />
  }
  return <PainelDoCorretor />
}
