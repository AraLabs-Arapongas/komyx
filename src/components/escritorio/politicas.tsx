'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { SlidersHorizontal, TrendingUp, Trash2 } from 'lucide-react'
import { ConfigForm } from '@/components/config-form'
import { Button } from '@/components/ui/button'
import { AvatarInicial } from '@/components/ui/avatar-inicial'
import { Voltar } from '@/components/voltar'
import { salvarPoliticaEscritorio, removerPoliticaEscritorio } from '@/lib/actions/escritorio'
import type { ConfigFinanceiraForm } from '@/lib/domain/schemas'
import type { PoliticaEstorno } from '@/lib/domain/types'

type Inicial = {
  nomePolitica: string
  faixas: { max: number | null; percentual: number; parcelas: number; distribuicao?: number[] | null }[]
  diaFechamento: number
  diaPrimeiroPagamento: number
  politicaEstorno: PoliticaEstorno
}

export type PoliticaResumo = {
  /** nulo = a geral, para todos */
  aplicaA: string | null
  faixaPorEscritorio: boolean
  inicial: Inicial
}

type MembroAtivo = { corretorId: string; nome: string; papel: 'dono' | 'corretor' }

/**
 * Lista e edição das políticas do escritório.
 *
 * A edição reusa o ConfigForm inteiro — as perguntas são as mesmas dos
 * Ajustes pessoais, só muda de quem é a resposta. O que a política de
 * escritório tem a mais é uma pergunta só: se a faixa é achada pelo acumulado
 * do escritório em vez do de cada corretor.
 */
export function PoliticasEscritorio({ politicas, membros }: {
  politicas: PoliticaResumo[]
  membros: MembroAtivo[]
}) {
  const router = useRouter()
  // null = lista; string|GERAL = editando aquele escopo
  const GERAL = '__geral__'
  const [editando, setEditando] = useState<string | null>(null)
  const [faixaEquipe, setFaixaEquipe] = useState(false)
  const [removendo, setRemovendo] = useState<string | null>(null)

  const geral = politicas.find(p => p.aplicaA === null) ?? null
  const especificas = new Map(politicas.filter(p => p.aplicaA).map(p => [p.aplicaA!, p]))

  function abrirEdicao(escopo: string) {
    const p = escopo === GERAL ? geral : especificas.get(escopo)
    setFaixaEquipe(p?.faixaPorEscritorio ?? geral?.faixaPorEscritorio ?? false)
    setEditando(escopo)
  }

  async function remover(escopo: string) {
    setRemovendo(escopo)
    const r = await removerPoliticaEscritorio(escopo === GERAL ? null : escopo)
    setRemovendo(null)
    if (!r.ok) { toast.error(r.erro); return }
    toast.success('Política removida. Cada corretor volta para a regra seguinte da fila.')
    router.refresh()
  }

  if (editando !== null) {
    const escopo = editando
    const p = escopo === GERAL ? geral : especificas.get(escopo)
    const membro = membros.find(m => m.corretorId === escopo)

    async function salvar(payload: ConfigFinanceiraForm) {
      return salvarPoliticaEscritorio(payload, {
        aplicaA: escopo === GERAL ? null : escopo,
        faixaPorEscritorio: faixaEquipe,
      })
    }

    return (
      <div className="coluna-formulario space-y-4">
        <Voltar rotulo="Voltar às políticas" aoVoltar={() => setEditando(null)} />
        <p className="text-sm text-muted-foreground">
          {escopo === GERAL
            ? 'Regra geral: vale para todo corretor sem política específica.'
            : `Política específica de ${membro?.nome ?? 'corretor'} — vence a geral.`}
        </p>

        {/*
          A pergunta extra fica fora dos passos e sempre visível: ela muda o
          espírito da política inteira, não um campo de um passo.
        */}
        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border bg-card p-4">
          <input type="checkbox" checked={faixaEquipe}
            onChange={e => setFaixaEquipe(e.target.checked)}
            className="mt-0.5 size-4 cursor-pointer accent-primary" />
          <span className="text-sm">
            <span className="flex items-center gap-1.5 font-medium">
              <TrendingUp size={15} /> Faixa pelo acumulado do escritório
            </span>
            <span className="text-muted-foreground">
              A faixa de cada corretor é definida pelo total vendido pela equipe no
              mês, não só pelo dele. A comissão continua sobre as vendas próprias.
            </span>
          </span>
        </label>

        <ConfigForm modo="edicao" inicial={p?.inicial}
          salvarComo={salvar}
          aposSalvar={() => {
            toast.success('Política salva. Os números de cada corretor atualizam na próxima abertura do app.')
            setEditando(null)
            router.refresh()
          }} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* a geral */}
      <section className="entra-suave space-y-3 rounded-lg border bg-card p-4 md:p-5">
        <div className="flex items-start gap-2.5">
          <SlidersHorizontal size={18} className="mt-0.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="font-medium">Regra geral</h2>
            <p className="text-sm text-muted-foreground">
              {geral
                ? `Definida${geral.faixaPorEscritorio ? ' · faixa pelo acumulado do escritório' : ''}. Vale para todos os corretores sem política específica.`
                : 'Ainda não definida: cada corretor segue as próprias regras.'}
            </p>
          </div>
          {geral && (
            <button type="button" onClick={() => remover(GERAL)} disabled={removendo !== null}
              aria-label="Remover regra geral"
              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive">
              <Trash2 size={16} />
            </button>
          )}
        </div>
        <Button type="button" size="toque" className="w-full"
          variant={geral ? 'outline' : 'default'} onClick={() => abrirEdicao(GERAL)}>
          {geral ? 'Editar regra geral' : 'Definir regra geral'}
        </Button>
      </section>

      {/* por corretor */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Por corretor</h2>
        <div className="divide-y overflow-hidden rounded-lg bg-card">
          {membros.map(m => {
            const p = especificas.get(m.corretorId)
            return (
              <div key={m.corretorId} className="flex items-center gap-3 px-4 py-3">
                <AvatarInicial nome={m.nome} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{m.nome}</span>
                  <span className="block text-xs text-muted-foreground">
                    {p ? 'Política específica' : geral ? 'Segue a regra geral' : 'Segue as próprias regras'}
                  </span>
                </span>
                {p && (
                  <button type="button" onClick={() => remover(m.corretorId)} disabled={removendo !== null}
                    aria-label={`Remover política de ${m.nome}`}
                    className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive">
                    <Trash2 size={16} />
                  </button>
                )}
                <Button type="button" variant="outline" size="sm" onClick={() => abrirEdicao(m.corretorId)}>
                  {p ? 'Editar' : 'Definir'}
                </Button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
