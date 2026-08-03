'use client'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Copy, MessageCircle, Trash2, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEquipe, type Membro } from '@/lib/queries/escritorio'
import { queryKeys } from '@/lib/queries/keys'
import { convidar, revogarConvite, removerMembro } from '@/lib/actions/escritorio'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AvatarInicial } from '@/components/ui/avatar-inicial'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

function linkDoConvite(token: string): string {
  return `${window.location.origin}/convite/${token}`
}

/**
 * Membros e convites, na tela do dono.
 *
 * O convite não manda e-mail nenhum — quem entrega o link é o próprio dono,
 * pelo WhatsApp ou colando onde quiser. É decisão, não falta: o SMTP disponível
 * manda dois e-mails por hora, e o corretor de consórcio vive no WhatsApp.
 */
export function Equipe() {
  const { data, isLoading } = useEquipe()
  const qc = useQueryClient()
  const [email, setEmail] = useState('')
  const [convidando, setConvidando] = useState(false)
  const [removendo, setRemovendo] = useState<Membro | null>(null)
  const [ocupado, setOcupado] = useState(false)

  function atualizar() {
    qc.invalidateQueries({ queryKey: queryKeys.equipe })
  }

  async function enviarConvite(e: React.FormEvent) {
    e.preventDefault()
    setConvidando(true)
    const r = await convidar(email)
    setConvidando(false)
    if (!r.ok) { toast.error(r.erro); return }
    setEmail('')
    atualizar()
    // já copia: o próximo gesto do dono é colar no WhatsApp, e poupar o toque
    // no botão de copiar é o que faz o fluxo caber num fôlego
    try {
      await navigator.clipboard.writeText(linkDoConvite(r.dados.token))
      toast.success('Convite criado e link copiado. É só colar no WhatsApp.')
    } catch {
      toast.success('Convite criado. Copie o link na lista abaixo.')
    }
  }

  async function copiar(token: string) {
    try {
      await navigator.clipboard.writeText(linkDoConvite(token))
      toast.success('Link copiado.')
    } catch {
      toast.error('Não foi possível copiar. Segure o link para copiar manualmente.')
    }
  }

  async function revogar(id: string) {
    const r = await revogarConvite(id)
    if (!r.ok) { toast.error(r.erro); return }
    atualizar()
  }

  async function confirmarRemocao() {
    if (!removendo) return
    setOcupado(true)
    const r = await removerMembro(removendo.membro_id)
    setOcupado(false)
    if (!r.ok) { toast.error(r.erro); return }
    setRemovendo(null)
    toast.success('Removido da equipe. O histórico do período fica guardado.')
    atualizar()
  }

  const ativos = data?.membros.filter(m => !m.saiu_em) ?? []
  const antigos = data?.membros.filter(m => m.saiu_em) ?? []

  /*
   * As vagas do plano. Mesma conta de `vagas_ocupadas` no banco: o dono não
   * ocupa vaga, e convite pendente ocupa — ele vira corretor a um clique de
   * distância, e não contá-lo deixaria o dono estourar o plano sem saber.
   */
  const limite = data?.limiteCorretores ?? null
  const ocupadas = ativos.filter(m => m.papel === 'corretor').length + (data?.convites.length ?? 0)
  const lotado = limite !== null && ocupadas >= limite

  return (
    <div className="space-y-4">
      {/* convidar */}
      <section className="entra-suave space-y-3 rounded-lg border bg-card p-4 md:p-5">
        <div className="flex items-start gap-2.5">
          <UserPlus size={18} className="mt-0.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="font-medium">Convidar corretor</h2>
            <p className="text-sm text-muted-foreground">
              Você recebe um link para mandar pelo WhatsApp. Quem abrir entra na equipe.
            </p>
          </div>
          {/* as vagas ficam junto do título, não escondidas numa mensagem de
              erro depois do envio: convite pendente ocupa vaga, e quem não vê
              isso dispara três links achando que só um contava */}
          {limite !== null && (
            <p className={cn('shrink-0 text-xs font-medium',
              lotado ? 'text-destructive' : 'text-muted-foreground')}>
              {ocupadas} de {limite} vagas
            </p>
          )}
        </div>
        <form onSubmit={enviarConvite} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email-convite">E-mail do corretor</Label>
            <Input id="email-convite" type="email" required value={email}
              onChange={e => setEmail(e.target.value)} placeholder="corretor@email.com"
              inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false}
              disabled={lotado} />
          </div>
          <Button type="submit" size="toque" className="w-full" disabled={convidando || lotado}>
            {convidando ? 'Criando…' : 'Criar convite'}
          </Button>
          {lotado && (
            <p className="text-sm text-muted-foreground">
              O plano está cheio. Remova alguém da equipe, revogue um convite
              pendente, ou fale com a gente para abrir mais vagas.
            </p>
          )}
        </form>
      </section>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : (
        <>
          {/* convites pendentes */}
          {(data?.convites.length ?? 0) > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">Convites pendentes</h2>
              <div className="divide-y overflow-hidden rounded-lg bg-card">
                {data!.convites.map(c => (
                  <div key={c.id} className="flex items-center gap-2 px-4 py-3">
                    <span className="min-w-0 flex-1 truncate text-sm">{c.email}</span>
                    <button type="button" onClick={() => copiar(c.token)} aria-label="Copiar link"
                      className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                      <Copy size={16} />
                    </button>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`Entra na equipe pelo Komyx: ${typeof window !== 'undefined' ? linkDoConvite(c.token) : ''}`)}`}
                      target="_blank" rel="noreferrer" aria-label="Mandar pelo WhatsApp"
                      className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                      <MessageCircle size={16} />
                    </a>
                    <button type="button" onClick={() => revogar(c.id)} aria-label="Revogar convite"
                      className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* membros */}
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">Na equipe</h2>
            <div className="divide-y overflow-hidden rounded-lg bg-card">
              {ativos.map(m => (
                <div key={m.membro_id} className="flex items-center gap-3 px-4 py-3">
                  <AvatarInicial nome={m.nome} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{m.nome}</span>
                    <span className="block text-xs text-muted-foreground">
                      {m.papel === 'dono' ? 'Dono' : 'Corretor'}
                    </span>
                  </span>
                  {m.papel !== 'dono' && (
                    <button type="button" onClick={() => setRemovendo(m)} aria-label={`Remover ${m.nome}`}
                      className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* quem já saiu: presente porque o histórico continua contando nos
              meses do vínculo — sumir com o nome deixaria o painel com números
              de gente que não existe */}
          {antigos.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">Já fizeram parte</h2>
              <div className="divide-y overflow-hidden rounded-lg bg-card">
                {antigos.map(m => (
                  <div key={m.membro_id} className="flex items-center gap-3 px-4 py-3 opacity-70">
                    <AvatarInicial nome={m.nome} />
                    <span className="min-w-0 flex-1 truncate text-sm">{m.nome}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={removendo !== null} onOpenChange={aberto => { if (!aberto) setRemovendo(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover {removendo?.nome} da equipe?</DialogTitle>
            <DialogDescription>
              As vendas continuam com o corretor, e a produção do período em que ele
              esteve na equipe continua nos seus painéis. Você só deixa de ver o que
              ele fizer daqui pra frente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" size="toque" onClick={() => setRemovendo(null)}>
              Cancelar
            </Button>
            <Button type="button" size="toque" disabled={ocupado} onClick={confirmarRemocao}>
              {ocupado ? 'Removendo…' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
