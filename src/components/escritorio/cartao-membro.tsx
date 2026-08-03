'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { Building2, CheckCircle2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { sairDoEscritorio } from '@/lib/actions/escritorio'

/**
 * O que o corretor comum vê da própria equipe: de qual escritório faz parte,
 * se a assinatura dele está cobrindo, e a porta de saída.
 *
 * Sair pede confirmação porque muda dinheiro: quem sai volta na hora para o
 * próprio teste ou assinatura individual — e as vendas continuam dele, o que a
 * confirmação diz com todas as letras para ninguém sair achando que perde algo.
 */
export function CartaoMembro({ nome, status }: {
  nome: string
  status: 'ativa' | 'encerrada' | null
}) {
  const [aberto, setAberto] = useState(false)
  const [saindo, setSaindo] = useState(false)

  async function sair() {
    setSaindo(true)
    const r = await sairDoEscritorio()
    if (!r.ok) {
      toast.error(r.erro)
      setSaindo(false)
      return
    }
    window.location.assign('/app/escritorio')
  }

  const cobrindo = status === 'ativa'

  return (
    <section className="entra-suave space-y-4 rounded-lg border bg-card p-4 md:p-5">
      <div className="flex items-start gap-2.5">
        <Building2 size={18} className="mt-0.5 shrink-0 text-muted-foreground" />
        <div className="space-y-1">
          <h2 className="font-medium">Você faz parte do {nome}</h2>
          <p className="text-sm text-muted-foreground">
            Suas vendas e clientes continuam seus. O dono do escritório vê a produção
            da equipe enquanto você fizer parte dela.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2.5 rounded-lg bg-background p-3 text-sm">
        {cobrindo ? (
          <>
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-money" />
            <span>
              <span className="font-medium">Assinatura por conta do escritório.</span>{' '}
              <span className="text-muted-foreground">Nenhuma cobrança para você.</span>
            </span>
          </>
        ) : (
          <>
            <Clock size={18} className="mt-0.5 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">
              A assinatura do escritório ainda não está ativa. Até lá, vale o seu
              plano individual.
            </span>
          </>
        )}
      </div>

      <Button type="button" variant="outline" size="toque" className="w-full"
        onClick={() => setAberto(true)}>
        Sair do escritório
      </Button>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sair do {nome}?</DialogTitle>
            <DialogDescription>
              Suas vendas e clientes continuam com você. O escritório deixa de ver a
              sua produção{cobrindo ? ' e a assinatura dele deixa de cobrir a sua conta' : ''}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" size="toque" onClick={() => setAberto(false)}>
              Ficar
            </Button>
            <Button type="button" size="toque" disabled={saindo} onClick={sair}>
              {saindo ? 'Saindo…' : 'Sair'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
