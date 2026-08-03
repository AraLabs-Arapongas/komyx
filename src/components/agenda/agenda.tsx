'use client'
import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, CalendarDays, User } from 'lucide-react'
import { useCompromissos, type Compromisso } from '@/lib/queries/compromissos'
import { concluirCompromisso } from '@/lib/actions/compromissos'
import { LayoutAba } from '@/components/ui/layout-aba'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { AvatarInicial } from '@/components/ui/avatar-inicial'
import { Seletor } from '@/components/seletor'
import { FormCompromisso } from '@/components/agenda/form-compromisso'
import { formatData, horaCurta } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * A agenda de compromissos.
 *
 * O corretor não abre esta tela para navegar um mês: ele abre para saber o que
 * fazer agora. Por isso não é um calendário de grade — é uma lista em gavetas,
 * do mais urgente ao menos, e a de cima é a que devia ter sido feita ontem.
 *
 * O dono lê a agenda da equipe (só lê). Para ele existe o seletor de pessoa;
 * para o corretor ele nem aparece, porque escolher entre uma opção é ruído.
 */

type Membro = { corretorId: string; nome: string }

const TODOS = '__todos__'

function hojeISO(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}

/** Domingo que fecha esta semana, para separar "esta semana" de "depois". */
function fimDaSemana(hoje: string): string {
  const [a, m, d] = hoje.split('-').map(Number)
  const base = new Date(Date.UTC(a, m - 1, d))
  base.setUTCDate(base.getUTCDate() + (7 - base.getUTCDay()) % 7)
  return base.toISOString().slice(0, 10)
}

export function Agenda({ euId, membros = [], ehDono = false }: {
  /** quem está olhando: separa a própria linha da linha de um corretor */
  euId: string
  /** a equipe, quando quem olha é o dono */
  membros?: Membro[]
  ehDono?: boolean
}) {
  const hoje = hojeISO()
  /*
   * A janela começa 30 dias atrás: o que está em aberto vem sempre, por mais
   * velho que seja, e o que já foi concluído só entra se for recente. Sem
   * corte, quem usa o app por um ano baixa mil linhas feitas para desenhar
   * quatro pendentes.
   */
  const desde = useMemo(() => {
    const [a, m, d] = hoje.split('-').map(Number)
    const base = new Date(Date.UTC(a, m - 1, d))
    base.setUTCDate(base.getUTCDate() - 30)
    return base.toISOString().slice(0, 10)
  }, [hoje])

  const { data: compromissos = [], isLoading } = useCompromissos(desde)
  const [quem, setQuem] = useState(TODOS)
  const [editando, setEditando] = useState<Compromisso | null>(null)
  const [criando, setCriando] = useState(false)

  const nomePorId = useMemo(
    () => new Map(membros.map(m => [m.corretorId, m.nome])), [membros])

  const visiveis = quem === TODOS
    ? compromissos
    : compromissos.filter(c => c.corretorId === quem)

  const pendentes = visiveis.filter(c => !c.concluidoEm)
  const domingo = fimDaSemana(hoje)

  const gavetas = [
    { titulo: 'Atrasados', itens: pendentes.filter(c => c.data < hoje), alerta: true },
    { titulo: 'Hoje', itens: pendentes.filter(c => c.data === hoje) },
    { titulo: 'Esta semana', itens: pendentes.filter(c => c.data > hoje && c.data <= domingo) },
    { titulo: 'Depois', itens: pendentes.filter(c => c.data > domingo) },
    { titulo: 'Concluídos', itens: visiveis.filter(c => c.concluidoEm), fechada: true },
  ].filter(g => g.itens.length > 0)

  return (
    <LayoutAba
      titulo="Agenda"
      acao={
        <Button type="button" size="sm" onClick={() => setCriando(true)}>
          <Plus size={18} /> Novo
        </Button>
      }
    >
      {ehDono && membros.length > 1 && (
        <Seletor
          valor={quem}
          padrao={TODOS}
          onMuda={setQuem}
          opcoes={[
            { valor: TODOS, rotulo: 'Toda a equipe' },
            ...membros.map(m => ({ valor: m.corretorId, rotulo: m.nome })),
          ]}
        />
      )}

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : gavetas.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <CalendarDays size={28} className="mx-auto text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            Nada marcado. Anote a ligação que você não pode esquecer.
          </p>
          <Button type="button" size="toque" className="mt-4" onClick={() => setCriando(true)}>
            <Plus size={18} /> Novo compromisso
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {gavetas.map(g => (
            <section key={g.titulo} className="space-y-2">
              <h2 className={cn('text-sm font-medium',
                g.alerta ? 'text-destructive' : 'text-muted-foreground')}>
                {g.titulo}
                <span className="ml-1.5 font-normal text-muted-foreground">{g.itens.length}</span>
              </h2>
              <div className="divide-y overflow-hidden rounded-lg bg-card">
                {g.itens.map(c => (
                  /* de outro = o dono olhando a linha de um corretor. É o que
                     decide mostrar a inicial de quem é e traduzir a recusa da
                     RLS numa frase em vez de num erro cru */
                  <Linha key={c.id} compromisso={c}
                    deOutro={c.corretorId !== euId}
                    nome={nomePorId.get(c.corretorId)}
                    aoEditar={() => setEditando(c)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {criando && (
        <FormCompromisso aberto aoFechar={() => setCriando(false)} dataPadrao={hoje} />
      )}
      {editando && (
        <FormCompromisso aberto compromisso={editando} dataPadrao={hoje}
          aoFechar={() => setEditando(null)} />
      )}
    </LayoutAba>
  )
}

function Linha({ compromisso: c, nome, deOutro, aoEditar }: {
  compromisso: Compromisso
  nome?: string
  /** o dono vendo a equipe: a linha ganha de quem é */
  deOutro: boolean
  somenteLeitura?: boolean
  aoEditar: () => void
}) {
  const qc = useQueryClient()
  const [ocupado, setOcupado] = useState(false)
  const feito = c.concluidoEm !== null

  async function alternar() {
    setOcupado(true)
    const r = await concluirCompromisso(c.id, !feito)
    setOcupado(false)
    if (!r.ok) { toast.error(r.erro); return }
    qc.invalidateQueries({ queryKey: ['compromissos'] })
  }

  return (
    <div className="flex items-start gap-3 px-4 py-3">
      {/*
        A linha de outro corretor não responde ao toque.

        O dono LÊ a agenda da equipe — a RLS não deixa escrever, e a action
        recusa. Mas deixar a caixinha clicável para ela recusar depois é
        prometer uma ação que não existe: melhor o alvo já dizer que não é
        dele.
      */}
      <Checkbox checked={feito} disabled={ocupado || deOutro} onCheckedChange={alternar}
        aria-label={feito ? `Reabrir ${c.titulo}` : `Concluir ${c.titulo}`}
        className="mt-0.5 shrink-0" />

      {/* o corpo inteiro abre a edição: alvo grande é o que funciona no
          celular, e a caixinha ao lado já cuida do "feito" */}
      <button type="button" onClick={aoEditar} disabled={deOutro}
        className="min-w-0 flex-1 text-left disabled:cursor-default">
        <span className={cn('block text-sm font-medium',
          feito && 'text-muted-foreground line-through')}>
          {c.titulo}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span className="tabular-nums">{formatData(c.data)}</span>
          {c.hora && <span className="tabular-nums">{horaCurta(c.hora)}</span>}
          {c.clienteNome && (
            <span className="flex items-center gap-1"><User size={12} />{c.clienteNome}</span>
          )}
        </span>
        {c.nota && <span className="mt-1 block text-xs text-muted-foreground">{c.nota}</span>}
      </button>

      {deOutro && nome && (
        <AvatarInicial nome={nome} className="size-7 shrink-0 text-[10px]" />
      )}
    </div>
  )
}
