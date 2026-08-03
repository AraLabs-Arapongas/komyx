'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { aceitarConvite } from '@/lib/actions/escritorio'

/**
 * O botão que fecha o convite, para quem já está logado.
 *
 * O erro fica na própria tela, não em toast: esta página vive fora do app e
 * não tem o Toaster montado — um toast aqui simplesmente não apareceria.
 */
export function BotaoAceitarConvite({ token, escritorio }: {
  token: string
  escritorio: string
}) {
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function aceitar() {
    setOcupado(true)
    setErro(null)
    const r = await aceitarConvite(token)
    if (!r.ok) {
      setErro(r.erro)
      setOcupado(false)
      return
    }
    // recarrega de verdade: o layout do app é server component e precisa
    // reavaliar o acesso com o vínculo novo
    window.location.assign('/app')
  }

  return (
    <div className="mt-8 space-y-3">
      {erro && (
        <p role="alert" className="rounded-lg bg-white/15 px-3 py-2 text-sm">
          {erro}
        </p>
      )}
      <Button type="button" size="toque" onClick={aceitar} disabled={ocupado}
        className="w-full bg-money-claro text-[#0B132B] hover:bg-money-claro/90">
        {ocupado ? 'Entrando…' : `Entrar no ${escritorio}`}
      </Button>
    </div>
  )
}
