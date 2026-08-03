'use client'
import { useEffect, useState } from 'react'
import { FlaskConical } from 'lucide-react'
import { contasDeTeste, type ContaDeTeste } from '@/lib/actions/dev'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

/** A senha que o seed local usa. Quem tiver outra digita normalmente. */
const SENHA_PADRAO = 'teste123'

/**
 * Atalho de desenvolvimento: escolher uma conta do banco local preenche os
 * campos do formulário.
 *
 * Existe porque testar o Enterprise significa trocar de conta o tempo todo —
 * dono, corretor, quem está fora — e decorar e-mail de teste é atrito puro.
 *
 * Preenche e para por aí, sem enviar: quem escolheu ainda pode conferir o que
 * vai entrar, e um formulário que se envia sozinho ao tocar num seletor é o
 * tipo de mágica que assusta na primeira vez.
 *
 * Quem protege isto é o SERVIDOR, não o `NODE_ENV` da página: `contasDeTeste`
 * devolve lista vazia em produção antes de tocar no banco, e sem contas o
 * componente não desenha nada. O guard no login evita até a chamada, mas o
 * import continua no pacote — medido, não suposto —, então nunca dependa dele
 * como fronteira de segurança.
 */
export function DevEntrarComo() {
  const [contas, setContas] = useState<ContaDeTeste[]>([])

  useEffect(() => {
    let vivo = true
    contasDeTeste().then(cs => { if (vivo) setContas(cs) })
    return () => { vivo = false }
  }, [])

  if (contas.length === 0) return null

  function preencher(email: string) {
    const form = document.querySelector('form')
    if (!form) return
    const campoEmail = form.querySelector<HTMLInputElement>('input[name="email"]')
    const campoSenha = form.querySelector<HTMLInputElement>('input[name="password"]')
    /*
     * O React não vê `input.value = x`: ele guarda o valor no nó e compara com
     * o dele. Escrevendo pelo setter do protótipo e disparando o evento, a
     * mudança passa pelo caminho normal — o mesmo truque que um autofill usa.
     */
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    for (const [campo, valor] of [[campoEmail, email], [campoSenha, SENHA_PADRAO]] as const) {
      if (!campo || !setter) continue
      setter.call(campo, valor)
      campo.dispatchEvent(new Event('input', { bubbles: true }))
    }
  }

  return (
    <div className="space-y-1.5 rounded-lg border border-dashed border-border p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <FlaskConical size={14} /> Contas do banco local
      </p>
      <Select onValueChange={preencher}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Preencher com uma conta…" />
        </SelectTrigger>
        <SelectContent>
          {contas.map(c => (
            <SelectItem key={c.email} value={c.email}>
              {c.nome}
              {c.papel && (
                <span className="text-muted-foreground">
                  {' · '}{c.papel === 'dono' ? 'dono' : 'corretor'}
                  {c.escritorio ? ` d${c.escritorio.startsWith('A') ? 'a' : 'o'} ${c.escritorio}` : ''}
                </span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-[11px] text-muted-foreground">
        Preenche o e-mail e a senha padrão do seed ({SENHA_PADRAO}). Não aparece em produção.
      </p>
    </div>
  )
}
