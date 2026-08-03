'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { Check, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { criarEscritorio } from '@/lib/actions/escritorio'
import { PLANO_ESCRITORIO, INCLUSO_ESCRITORIO } from '@/lib/assinatura/plano'

/**
 * O que aparece para quem ainda não tem escritório.
 *
 * O mesmo argumento da landing, com uma saída a mais: criar o escritório
 * agora. Criar não custa nada e não liga cobrança nenhuma — o texto deixa
 * claro que a ativação é conversada, porque um botão que parece contratar
 * algo "sob medida" sem falar com ninguém gera desconfiança, não conversão.
 */
export function PitchEscritorio() {
  const [nome, setNome] = useState('')
  const [criando, setCriando] = useState(false)
  const [abriuForm, setAbriuForm] = useState(false)

  async function criar(e: React.FormEvent) {
    e.preventDefault()
    setCriando(true)
    const r = await criarEscritorio(nome)
    if (!r.ok) {
      toast.error(r.erro)
      setCriando(false)
      return
    }
    // recarrega: a página é server component e decide a tela pelo vínculo
    window.location.assign('/app/escritorio')
  }

  return (
    <div className="space-y-4">
      <section className="entra-suave space-y-4 rounded-lg border bg-card p-4 md:p-5">
        <div className="flex items-start gap-2.5">
          <Building2 size={18} className="mt-0.5 shrink-0 text-muted-foreground" />
          <div className="space-y-1">
            <h2 className="font-medium">{PLANO_ESCRITORIO.nome}</h2>
            <p className="text-sm text-muted-foreground">{PLANO_ESCRITORIO.apoio}</p>
          </div>
        </div>

        <ul className="space-y-3 text-sm">
          {INCLUSO_ESCRITORIO.map(item => (
            <li key={item} className="flex items-start gap-2.5">
              <Check size={18} className="mt-0.5 shrink-0 text-money" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="entra-suave space-y-3 rounded-lg border bg-card p-4 md:p-5">
        {abriuForm ? (
          <form onSubmit={criar} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="nome-escritorio">Nome do escritório</Label>
              <Input id="nome-escritorio" value={nome} onChange={e => setNome(e.target.value)}
                placeholder="Consórcios Silva" required />
            </div>
            <Button type="submit" size="toque" className="w-full" disabled={criando}>
              {criando ? 'Criando…' : 'Criar escritório'}
            </Button>
          </form>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Crie o seu escritório agora e monte a equipe. O plano é sob medida:
              a gente conversa antes de qualquer cobrança, e nada é cobrado até lá.
            </p>
            <Button type="button" size="toque" className="w-full" onClick={() => setAbriuForm(true)}>
              Criar meu escritório
            </Button>
          </>
        )}
      </section>
    </div>
  )
}
