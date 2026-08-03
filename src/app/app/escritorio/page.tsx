import { createClient } from '@/lib/supabase/server'
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina'
import { PainelEscritorio } from '@/components/escritorio/painel'
import { CartaoMembro } from '@/components/escritorio/cartao-membro'
import { PitchEscritorio } from '@/components/escritorio/pitch'

/**
 * A porta da área do escritório, que é três telas em uma.
 *
 * Quem decide é o vínculo: o dono cai no painel de produção, o membro vê de
 * qual equipe faz parte, e quem não tem nada encontra o convite para criar o
 * seu — este último é o motivo de o item do menu ser sempre visível, ele
 * também é canal de venda.
 */
export default async function EscritorioPage() {
  const supabase = await createClient()
  const { data } = await supabase.rpc('meu_escritorio')
  const vinculo = data as {
    escritorio_id: string
    nome: string
    papel: 'dono' | 'corretor'
    assinatura_status: 'ativa' | 'encerrada' | null
    assinatura_ate: string | null
  } | null

  return (
    <div className="space-y-4">
      <CabecalhoPagina voltarPara="/app/perfil" titulo="Escritório"
        apoio={vinculo
          ? vinculo.nome
          : 'A produção da sua equipe inteira, num painel só.'} />

      {!vinculo && <PitchEscritorio />}
      {vinculo?.papel === 'corretor' && (
        <CartaoMembro nome={vinculo.nome} status={vinculo.assinatura_status} />
      )}
      {vinculo?.papel === 'dono' && (
        <PainelEscritorio status={vinculo.assinatura_status} />
      )}
    </div>
  )
}
