'use client'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

/**
 * Volta para de onde o corretor veio — a agenda leva ao detalhe da venda tanto
 * quanto a lista de vendas, então uma âncora fixa mandaria ele para o lugar
 * errado. Sem histórico (link aberto direto), cai no `href`.
 */
export function Voltar({ href, rotulo = 'Voltar', aoVoltar }: {
  href?: string
  rotulo?: string
  /** Quando a tela é um modo (edição), voltar é sair do modo, não navegar. */
  aoVoltar?: () => void
}) {
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={() => {
        if (aoVoltar) { aoVoltar(); return }
        if (typeof window !== 'undefined' && window.history.length > 1) router.back()
        else if (href) router.push(href)
      }}
      className="-ml-1 inline-flex items-center gap-0.5 rounded-full py-1 pl-1 pr-2.5 text-sm
                 text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
    >
      <ChevronLeft size={18} />
      {rotulo}
    </button>
  )
}
