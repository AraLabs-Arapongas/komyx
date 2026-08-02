'use client'
import { useState } from 'react'
import { registrarLead } from '@/lib/actions/leads'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Check } from 'lucide-react'

/**
 * Para quem ainda não vai criar conta.
 *
 * O cadastro é grátis e leva menos de um minuto, então ele continua sendo o
 * caminho principal da página. Este formulário atende o visitante que só está
 * olhando — sem ele, essa pessoa vai embora sem deixar rastro.
 */
export function CapturaLead({ origem = 'landing' }: { origem?: string }) {
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [pronto, setPronto] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    const r = await registrarLead({ email, origem })
    setEnviando(false)
    if (!r.ok) { setErro(r.erro); return }
    setPronto(true)
  }

  if (pronto) {
    return (
      <p className="entra flex items-center justify-center gap-2 text-sm font-medium text-money">
        <Check size={18} /> Pronto. Falamos com você em {email}.
      </p>
    )
  }

  return (
    <form onSubmit={enviar} className="mx-auto w-full max-w-md space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="seu@email.com"
          aria-label="Seu e-mail"
          className="bg-card sm:flex-1"
        />
        <Button type="submit" size="toque" disabled={enviando}>
          {enviando ? 'Enviando…' : 'Quero saber mais'}
        </Button>
      </div>
      {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
    </form>
  )
}
