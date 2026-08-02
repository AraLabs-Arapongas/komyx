'use client'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { CreditCard, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { abrirCheckout, abrirPortal } from '@/lib/actions/assinatura'
import { cn } from '@/lib/utils'

/**
 * Os dois botões que saem do Komyx para o Stripe.
 *
 * Os dois têm o mesmo comportamento estranho: em caso de sucesso a ação não
 * volta — ela redireciona para fora, e este componente é desmontado no meio da
 * transição. Só o caso de erro chega de volta aqui, como objeto.
 *
 * `pendente` continua ligado depois do clique bem-sucedido de propósito: a
 * viagem até o Stripe leva um instante, e um botão que volta ao normal nesse
 * intervalo convida ao segundo clique — que abriria uma segunda sessão de
 * checkout.
 */
function useIdaAoStripe(acao: () => Promise<{ ok: false; erro: string } | void>) {
  const [transicao, iniciar] = useTransition()
  const [saindo, setSaindo] = useState(false)

  function ir() {
    setSaindo(true)
    iniciar(async () => {
      const r = await acao()
      // só volta com valor quando deu errado
      if (r && !r.ok) {
        toast.error(r.erro)
        setSaindo(false)
      }
    })
  }

  return { ir, pendente: transicao || saindo }
}

export function BotaoAssinar({ rotulo = 'Assinar agora', className }: {
  rotulo?: string
  className?: string
}) {
  const { ir, pendente } = useIdaAoStripe(abrirCheckout)
  return (
    <Button type="button" size="toque" onClick={ir} disabled={pendente}
      className={cn('w-full bg-money-claro text-[#0B132B] hover:bg-money-claro/90', className)}>
      {pendente ? 'Abrindo pagamento…' : <><CreditCard size={18} /> {rotulo}</>}
    </Button>
  )
}

export function BotaoPortal({ rotulo = 'Gerenciar assinatura' }: { rotulo?: string }) {
  const { ir, pendente } = useIdaAoStripe(abrirPortal)
  return (
    <Button type="button" variant="outline" size="toque" onClick={ir} disabled={pendente}
      className="w-full">
      {pendente ? 'Abrindo…' : <><ExternalLink size={18} /> {rotulo}</>}
    </Button>
  )
}
