'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { simularAssinatura, type EstadoSimulado } from '@/lib/actions/dev'

/**
 * Bastidor da assinatura: põe a conta em cada estado e recarrega.
 *
 * Recarrega de verdade, e não com router.refresh(), porque quem decide o que
 * renderizar é o layout do servidor — o portão troca a árvore inteira.
 */
const ESTADOS: { chave: EstadoSimulado; rotulo: string; efeito: string }[] = [
  { chave: 'teste_cheio', rotulo: 'Teste cheio', efeito: '14 dias pela frente, sem aviso nenhum' },
  { chave: 'teste_acabando', rotulo: 'Teste acabando', efeito: '2 dias — acende a tarja no topo' },
  { chave: 'teste_acabou', rotulo: 'Teste acabou', efeito: 'fecha o portão' },
  { chave: 'assinante', rotulo: 'Assinante', efeito: 'ativa, renova em 30 dias' },
  { chave: 'cobranca_falhou', rotulo: 'Cobrança falhou', efeito: 'past_due: libera, mas avisa' },
  { chave: 'assinatura_acabou', rotulo: 'Assinatura encerrada', efeito: 'canceled: fecha o portão' },
]

function useSimulador() {
  const [ocupado, setOcupado] = useState<EstadoSimulado | null>(null)

  async function aplicar(estado: EstadoSimulado) {
    setOcupado(estado)
    const r = await simularAssinatura(estado)
    if (!r.ok) { setOcupado(null); toast.error(r.erro); return }
    window.location.assign('/app')
  }

  return { ocupado, aplicar }
}

export function SimuladorAssinatura() {
  const { ocupado, aplicar } = useSimulador()

  return (
    <div className="space-y-2 border-t pt-3">
      <p className="text-sm font-medium">Simular assinatura</p>
      <p className="text-xs text-muted-foreground">
        Grava o estado direto no perfil e recarrega o app. Aqui o portão fecha mesmo sem
        as chaves do Stripe — a volta é o botão de bastidor dentro dele. Em produção,
        sem as chaves, ele não fecha.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {ESTADOS.map(({ chave, rotulo, efeito }) => (
          <Button key={chave} variant="outline" size="sm" disabled={ocupado !== null}
            onClick={() => aplicar(chave)}
            className="h-auto flex-col items-start gap-0.5 py-2 text-left">
            <span className="font-medium">{ocupado === chave ? 'Aplicando…' : rotulo}</span>
            <span className="text-xs font-normal text-muted-foreground">{efeito}</span>
          </Button>
        ))}
      </div>
    </div>
  )
}

/**
 * A saída de emergência do portão, em desenvolvimento.
 *
 * Sem ela, simular o fim do teste tranca o próprio menu que criou a situação —
 * o bastidor mora dentro de /app, e o portão ocupa /app inteiro. Quem testasse
 * o portão ficaria sem caminho de volta que não fosse mexer no banco na mão.
 */
export function BotaoVoltarAoTeste() {
  const { ocupado, aplicar } = useSimulador()

  return (
    <Button type="button" variant="ghost" size="sm" disabled={ocupado !== null}
      onClick={() => aplicar('teste_cheio')} className="w-full text-muted-foreground">
      {ocupado ? 'Voltando…' : 'dev: voltar ao teste'}
    </Button>
  )
}
