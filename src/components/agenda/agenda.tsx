'use client'
import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Plus, CalendarDays, User, ChevronLeft, ChevronRight, List, LayoutGrid,
} from 'lucide-react'
import { useCompromissos, type Compromisso } from '@/lib/queries/compromissos'
import { concluirCompromisso } from '@/lib/actions/compromissos'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { AvatarInicial } from '@/components/ui/avatar-inicial'
import { Seletor } from '@/components/seletor'
import { GradeMes, diasDaGrade } from '@/components/agenda/grade-mes'
import { FormCompromisso } from '@/components/agenda/form-compromisso'
import { formatData, formatMesAno, horaCurta } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * A agenda de compromissos.
 *
 * Duas vistas, porque são duas perguntas diferentes. O mês responde "como está
 * a minha semana que vem" — é o calendário que todo mundo já sabe usar. A
 * lista responde "o que eu tenho que fazer agora", e essa nenhum calendário
 * responde bem: o que venceu ontem fica no quadrado de ontem, que ninguém
 * olha. Por isso a lista abre com Atrasados no topo, em vermelho.
 *
 * O dono lê a agenda da equipe (só lê). Para ele existe o seletor de pessoa;
 * para o corretor ele nem aparece, porque escolher entre uma opção é ruído.
 */

type Membro = { corretorId: string; nome: string }
type Vista = 'mes' | 'lista'

const TODOS = '__todos__'

function hojeISO(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}

function somarDias(data: string, dias: number): string {
  const [a, m, d] = data.split('-').map(Number)
  const base = new Date(Date.UTC(a, m - 1, d))
  base.setUTCDate(base.getUTCDate() + dias)
  return base.toISOString().slice(0, 10)
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
  const [vista, setVista] = useState<Vista>('mes')
  const [mesRef, setMesRef] = useState(() => hoje.slice(0, 7))
  const [selecionado, setSelecionado] = useState(hoje)
  const [quem, setQuem] = useState(TODOS)
  const [editando, setEditando] = useState<Compromisso | null>(null)
  const [criandoEm, setCriandoEm] = useState<string | null>(null)

  const ano = Number(mesRef.slice(0, 4))
  const mes = Number(mesRef.slice(5, 7))

  /*
   * A janela da consulta.
   *
   * No mês, exatamente a grade — as seis semanas que aparecem, nem uma linha
   * a mais. Na lista, uma faixa larga em volta de hoje, porque ela mostra
   * atrasados de meses atrás e assembleias marcadas para o ano que vem.
   */
  const [de, ate] = useMemo(() => {
    if (vista === 'mes') {
      const dias = diasDaGrade(ano, mes)
      return [dias[0], dias[dias.length - 1]]
    }
    return [somarDias(hoje, -365), somarDias(hoje, 365)]
  }, [vista, ano, mes, hoje])

  const { data: compromissos = [], isLoading } = useCompromissos(de, ate)

  const nomePorId = useMemo(
    () => new Map(membros.map(m => [m.corretorId, m.nome])), [membros])

  const visiveis = quem === TODOS
    ? compromissos
    : compromissos.filter(c => c.corretorId === quem)

  function irParaHoje() {
    setMesRef(hoje.slice(0, 7))
    setSelecionado(hoje)
  }

  function mudarMes(passo: -1 | 1) {
    const total = ano * 12 + (mes - 1) + passo
    const a = Math.floor(total / 12)
    const m = (total % 12) + 1
    setMesRef(`${a}-${String(m).padStart(2, '0')}`)
  }

  return (
    <div className="space-y-4">
      {/* cabeçalho: onde estamos, e as duas ações que valem por si */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <h1 className="text-xl font-semibold">Agenda</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* alternar vista é uma escolha de duas: pílula, não menu */}
          <div className="flex rounded-full bg-muted p-0.5">
            {([['mes', 'Mês', LayoutGrid], ['lista', 'Lista', List]] as const).map(([v, rotulo, Icone]) => (
              <button key={v} type="button" onClick={() => setVista(v)}
                aria-pressed={vista === v}
                className={cn('flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors',
                  vista === v ? 'bg-card font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                <Icone size={15} /> {rotulo}
              </button>
            ))}
          </div>
          <Button type="button" size="sm" onClick={() => setCriandoEm(selecionado)}>
            <Plus size={18} /> Novo
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {vista === 'mes' ? (
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Mês anterior" onClick={() => mudarMes(-1)}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <ChevronLeft size={18} />
            </button>
            <p className="min-w-40 text-center font-medium" aria-live="polite">
              {formatMesAno(ano, mes)}
            </p>
            <button type="button" aria-label="Próximo mês" onClick={() => mudarMes(1)}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <ChevronRight size={18} />
            </button>
            <Button type="button" variant="outline" size="sm" onClick={irParaHoje}>Hoje</Button>
          </div>
        ) : <span />}

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
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full rounded-lg" />
      ) : vista === 'mes' ? (
        <>
          <GradeMes
            ano={ano} mes={mes} hoje={hoje} selecionado={selecionado}
            compromissos={visiveis} euId={euId} nomePorId={nomePorId}
            /*
             * Tocar num dia já abre o novo compromisso naquele dia.
             *
             * É o gesto do calendário que todo mundo conhece: clicou no
             * quadrado, marcou ali. Selecionar e depois procurar um botão
             * "novo" transformaria dois toques no que sempre foi um — e o dia
             * fica escolhido de qualquer forma, então fechar o diálogo deixa
             * o painel de baixo mostrando aquele dia.
             */
            aoSelecionar={data => { setSelecionado(data); setCriandoEm(data) }}
            aoAbrir={setEditando}
          />
          <PainelDoDia
            data={selecionado} hoje={hoje}
            itens={visiveis.filter(c => c.data === selecionado)}
            euId={euId} nomePorId={nomePorId}
            aoEditar={setEditando}
            aoNovo={() => setCriandoEm(selecionado)}
          />
        </>
      ) : (
        <ListaEmGavetas
          itens={visiveis} hoje={hoje} euId={euId} nomePorId={nomePorId}
          aoEditar={setEditando} aoNovo={() => setCriandoEm(hoje)}
        />
      )}

      {criandoEm && (
        <FormCompromisso aberto dataPadrao={criandoEm} aoFechar={() => setCriandoEm(null)} />
      )}
      {editando && (
        <FormCompromisso aberto compromisso={editando} dataPadrao={hoje}
          aoFechar={() => setEditando(null)} />
      )}
    </div>
  )
}

/**
 * O dia escolhido, por extenso, embaixo da grade.
 *
 * A célula da grade corta o título e esconde o terceiro compromisso — cabe
 * pouca coisa num quadrado de 100px. Aqui embaixo o dia aparece inteiro, com
 * nota e cliente, e é onde se marca como feito. No celular, onde a grade é
 * quase só números, este painel é a agenda de verdade.
 */
function PainelDoDia({ data, hoje, itens, euId, nomePorId, aoEditar, aoNovo }: {
  data: string
  hoje: string
  itens: Compromisso[]
  euId: string
  nomePorId: Map<string, string>
  aoEditar: (c: Compromisso) => void
  aoNovo: () => void
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">
          {data === hoje ? 'Hoje' : formatData(data)}
          <span className="ml-1.5 font-normal text-muted-foreground">{itens.length}</span>
        </h2>
        <Button type="button" variant="outline" size="sm" onClick={aoNovo}>
          <Plus size={16} /> Marcar neste dia
        </Button>
      </div>

      {itens.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          Nada marcado neste dia.
        </p>
      ) : (
        <div className="divide-y overflow-hidden rounded-lg bg-card">
          {itens.map(c => (
            <Linha key={c.id} compromisso={c} deOutro={c.corretorId !== euId}
              nome={nomePorId.get(c.corretorId)} aoEditar={() => aoEditar(c)} />
          ))}
        </div>
      )}
    </section>
  )
}

/** A vista de tarefa: o que está em aberto, do mais urgente ao menos. */
function ListaEmGavetas({ itens, hoje, euId, nomePorId, aoEditar, aoNovo }: {
  itens: Compromisso[]
  hoje: string
  euId: string
  nomePorId: Map<string, string>
  aoEditar: (c: Compromisso) => void
  aoNovo: () => void
}) {
  const pendentes = itens.filter(c => !c.concluidoEm)
  const domingo = fimDaSemana(hoje)
  const recentes = somarDias(hoje, -30)

  const gavetas = [
    { titulo: 'Atrasados', itens: pendentes.filter(c => c.data < hoje), alerta: true },
    { titulo: 'Hoje', itens: pendentes.filter(c => c.data === hoje) },
    { titulo: 'Esta semana', itens: pendentes.filter(c => c.data > hoje && c.data <= domingo) },
    { titulo: 'Depois', itens: pendentes.filter(c => c.data > domingo) },
    // concluído antigo não interessa: quem rola até o fim quer ver o que
    // resolveu nesta virada de mês, não o ano inteiro
    { titulo: 'Concluídos', itens: itens.filter(c => c.concluidoEm && c.data >= recentes) },
  ].filter(g => g.itens.length > 0)

  if (gavetas.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <CalendarDays size={28} className="mx-auto text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">
          Nada marcado. Anote a ligação que você não pode esquecer.
        </p>
        <Button type="button" size="toque" className="mt-4" onClick={aoNovo}>
          <Plus size={18} /> Novo compromisso
        </Button>
      </div>
    )
  }

  return (
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
              <Linha key={c.id} compromisso={c} deOutro={c.corretorId !== euId}
                nome={nomePorId.get(c.corretorId)} aoEditar={() => aoEditar(c)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function Linha({ compromisso: c, nome, deOutro, aoEditar }: {
  compromisso: Compromisso
  nome?: string
  /** o dono vendo a linha de um corretor */
  deOutro: boolean
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
