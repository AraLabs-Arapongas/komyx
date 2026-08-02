'use client'
import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { sair } from '@/app/(auth)/actions'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

/**
 * Sair da conta, com confirmação.
 *
 * A confirmação existe porque o botão mora na barra superior, ao lado do olho
 * de esconder valores — dois ícones vizinhos, um inofensivo e o outro
 * derrubando a sessão. Sem a pergunta, o toque errado custa refazer o login no
 * meio de um atendimento.
 */
export function BotaoSair({ variante = 'icone', className }: {
  /** 'icone' na barra superior, 'botao' na lista do perfil */
  variante?: 'icone' | 'botao'
  className?: string
}) {
  const [aberto, setAberto] = useState(false)
  const [saindo, setSaindo] = useState(false)

  return (
    <>
      {variante === 'icone' ? (
        <button type="button" aria-label="Sair da conta" onClick={() => setAberto(true)}
          className={cn('rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground', className)}>
          <LogOut size={18} />
        </button>
      ) : (
        <Button type="button" variant="outline" size="toque" className={cn('w-full', className)}
          onClick={() => setAberto(true)}>
          Sair
        </Button>
      )}

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sair da conta?</DialogTitle>
            <DialogDescription>
              Seus dados continuam salvos. Você vai precisar entrar de novo neste aparelho.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" size="toque"
              onClick={() => setAberto(false)}>
              Continuar aqui
            </Button>
            {/* a ação é do servidor: o form garante que ela rode mesmo se o
                JavaScript falhar depois que o diálogo abriu */}
            <form action={sair} onSubmit={() => setSaindo(true)} className="contents">
              <Button type="submit" size="toque" disabled={saindo}>
                {saindo ? 'Saindo…' : 'Sair'}
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
