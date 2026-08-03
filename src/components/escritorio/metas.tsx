'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { salvarMetas, removerMetasDoMes } from '@/lib/actions/escritorio'
import { parseBRLParaCentavos } from '@/lib/format'
import { CampoValor } from '@/components/campos'
import { AvatarInicial } from '@/components/ui/avatar-inicial'
import { Label } from '@/components/ui/label'
import { BarraAcao } from '@/components/ui/barra-acao'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Voltar } from '@/components/voltar'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez']

type Membro = { corretorId: string; nome: string }
type Linha = { corretor_id: string | null; valor_centavos: number; vigente_de: string }

/** Uma vigência: a data em que começa e o que ela define. */
type Vigencia = {
  vigenteDe: string
  casaCentavos: number | null
  porCorretor: Record<string, number>
}

function mesAtual(): { ano: number; mes: number } {
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
  const [ano, mes] = hoje.split('-').map(Number)
  return { ano, mes }
}

function comoData(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}-01`
}

function comoRef(data: string): { ano: number; mes: number } {
  const [ano, mes] = data.split('-').map(Number)
  return { ano, mes }
}

function emReais(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

/** "R$ 500 mil", "R$ 1,2 mi" — na grade, o número precisa caber na célula. */
function curto(centavos: number): string {
  const reais = centavos / 100
  if (reais >= 1_000_000) return `R$ ${(reais / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
  if (reais >= 1_000) return `R$ ${Math.round(reais / 1_000)} mil`
  return `R$ ${reais.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
}

function useVigencias() {
  return useQuery({
    queryKey: ['metas-vigencias'],
    queryFn: async (): Promise<Vigencia[]> => {
      const supabase = createClient()
      const { data, error } = await supabase.from('metas_escritorio')
        .select('corretor_id, valor_centavos, vigente_de')
      if (error) throw error

      const porData = new Map<string, Vigencia>()
      for (const l of (data ?? []) as Linha[]) {
        const v = porData.get(l.vigente_de)
          ?? { vigenteDe: l.vigente_de, casaCentavos: null, porCorretor: {} }
        if (l.corretor_id) v.porCorretor[l.corretor_id] = Number(l.valor_centavos)
        else v.casaCentavos = Number(l.valor_centavos)
        porData.set(l.vigente_de, v)
      }
      // da mais antiga para a mais nova: é a ordem da linha do tempo
      return [...porData.values()].sort((a, b) => a.vigenteDe.localeCompare(b.vigenteDe))
    },
  })
}

/** A vigência que vale num mês: a última que começou até ele. */
function vigenteEm(vigencias: Vigencia[], ano: number, mes: number): Vigencia | null {
  const alvo = comoData(ano, mes)
  let achada: Vigencia | null = null
  for (const v of vigencias) {
    if (v.vigenteDe <= alvo) achada = v
    else break
  }
  return achada
}

/**
 * Metas do escritório, o ano inteiro à vista.
 *
 * A primeira versão navegava mês a mês e não mostrava o que existia adiante:
 * corrigir a meta de julho parecia que ia atropelar agosto, e não dava para
 * saber sem tentar. Com a grade, o dono vê os doze meses, onde cada meta
 * começa e até onde ela vale — e clicar num mês deixa de ser aposta.
 *
 * O modelo continua sendo vigência: o que se salva num mês vale dele em
 * diante, até a próxima. A grade é o que torna isso visível.
 */
export function MetasEscritorio({ membros }: { membros: Membro[] }) {
  const { data: vigencias, isLoading } = useVigencias()
  const hoje = mesAtual()
  const [ano, setAno] = useState(hoje.ano)
  const [editando, setEditando] = useState<{ ano: number; mes: number } | null>(null)

  if (isLoading || !vigencias) {
    return <Skeleton className="h-64 w-full" />
  }

  if (editando) {
    const vigencia = vigencias.find(v => v.vigenteDe === comoData(editando.ano, editando.mes))
    const herdada = !vigencia ? vigenteEm(vigencias, editando.ano, editando.mes) : null
    return (
      <FormVigencia
        key={comoData(editando.ano, editando.mes)}
        membros={membros} ref_={editando}
        vigencia={vigencia} herdada={herdada}
        aoSair={() => setEditando(null)}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Metas do escritório</h2>
        <div className="flex items-center gap-0.5 rounded-full bg-card px-1 py-0.5 text-sm">
          <button onClick={() => setAno(a => a - 1)} aria-label="Ano anterior"
            className="rounded-full p-1.5 transition-colors hover:bg-muted">
            <ChevronLeft size={16} />
          </button>
          <span className="px-2 font-medium tabular-nums">{ano}</span>
          <button onClick={() => setAno(a => a + 1)} aria-label="Próximo ano"
            className="rounded-full p-1.5 transition-colors hover:bg-muted">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {MESES.map((_, i) => {
          const mes = i + 1
          const vigencia = vigencias.find(v => v.vigenteDe === comoData(ano, mes))
          const valendo = vigencia ?? vigenteEm(vigencias, ano, mes)
          const ehAtual = ano === hoje.ano && mes === hoje.mes
          const passado = ano < hoje.ano || (ano === hoje.ano && mes < hoje.mes)

          return (
            <button key={mes} type="button" onClick={() => setEditando({ ano, mes })}
              className={cn(
                'space-y-1 rounded-lg border p-3 text-left transition-colors hover:border-primary/50',
                ehAtual ? 'border-primary bg-primary/5' : 'bg-card',
                passado && !ehAtual && 'opacity-70',
              )}>
              <div className="flex items-baseline justify-between gap-2">
                <span className={cn('text-sm font-medium capitalize',
                  ehAtual && 'text-primary')}>
                  {CURTOS[i]}
                </span>
                {/* onde a meta MUDA: é o que explica por que os meses
                    seguintes têm o mesmo número */}
                {vigencia && (
                  <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
                    define
                  </span>
                )}
              </div>
              <p className={cn('text-sm font-semibold tabular-nums',
                !valendo?.casaCentavos && 'font-normal text-muted-foreground')}>
                {valendo?.casaCentavos ? curto(valendo.casaCentavos) : 'sem meta'}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {vigencia ? 'começa aqui' : valendo ? 'segue a anterior' : '—'}
              </p>
            </button>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        A meta vale do mês em que começa até a próxima. Toque num mês para definir
        uma nova — os meses anteriores não mudam.
      </p>
    </div>
  )
}

function FormVigencia({ membros, ref_, vigencia, herdada, aoSair }: {
  membros: Membro[]
  ref_: { ano: number; mes: number }
  /** a vigência que COMEÇA neste mês, se houver */
  vigencia: Vigencia | undefined
  /** a que ele está herdando, quando não define nada */
  herdada: Vigencia | null
  aoSair: () => void
}) {
  const qc = useQueryClient()
  const base = vigencia ?? herdada
  const [casaTxt, setCasaTxt] = useState(base?.casaCentavos ? emReais(base.casaCentavos) : '')
  const [porCorretor, setPorCorretor] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(base?.porCorretor ?? {}).map(([id, c]) => [id, emReais(c)])))
  const [salvando, setSalvando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [removendo, setRemovendo] = useState(false)

  function invalidar() {
    qc.invalidateQueries({ queryKey: ['metas-vigencias'] })
    qc.invalidateQueries({ queryKey: ['painel-do-dono'] })
  }

  async function salvar() {
    setSalvando(true)
    const r = await salvarMetas(ref_.ano, ref_.mes, [
      { corretorId: null, valorCentavos: parseBRLParaCentavos(casaTxt) },
      ...membros.map(m => ({
        corretorId: m.corretorId,
        valorCentavos: parseBRLParaCentavos(porCorretor[m.corretorId] ?? ''),
      })),
    ])
    setSalvando(false)
    if (!r.ok) { toast.error(r.erro); return }
    toast.success(`Metas valendo de ${MESES[ref_.mes - 1]} de ${ref_.ano} em diante.`)
    invalidar()
    aoSair()
  }

  async function remover() {
    setRemovendo(true)
    const r = await removerMetasDoMes(ref_.ano, ref_.mes)
    setRemovendo(false)
    if (!r.ok) { toast.error(r.erro); return }
    toast.success('Meta removida. Vale de novo a anterior, se houver.')
    invalidar()
    aoSair()
  }

  return (
    <div className="coluna-formulario space-y-5">
      <Voltar rotulo="Voltar às metas" aoVoltar={aoSair} />

      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{MESES[ref_.mes - 1]} de {ref_.ano}</h2>
        <p className="text-sm text-muted-foreground">
          {vigencia
            ? 'A meta começa neste mês. Editar aqui muda também os meses seguintes que a seguem.'
            : herdada
              ? `Hoje este mês segue a meta que começou em ${MESES[comoRef(herdada.vigenteDe).mes - 1]} de ${comoRef(herdada.vigenteDe).ano}. Salvar cria uma meta a partir daqui — os meses anteriores não mudam.`
              : 'Nenhuma meta vale neste mês. O que você salvar aqui vale daqui em diante.'}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="meta-casa">Meta do escritório</Label>
        <CampoValor id="meta-casa" value={casaTxt} onChange={setCasaTxt} placeholder="0,00" />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Por corretor</h2>
        {membros.map(m => (
          <div key={m.corretorId} className="flex items-center gap-3">
            <AvatarInicial nome={m.nome} />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{m.nome}</span>
            <CampoValor value={porCorretor[m.corretorId] ?? ''}
              onChange={v => setPorCorretor(prev => ({ ...prev, [m.corretorId]: v }))}
              className="max-w-[11rem]" placeholder="0,00" />
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">Campo vazio é meta que não existe.</p>

      {vigencia && (
        <Button type="button" variant="outline" size="sm" onClick={() => setConfirmando(true)}
          className="self-start text-muted-foreground">
          <Trash2 size={16} /> Remover a meta deste mês
        </Button>
      )}

      <div className="flex-1" />
      <BarraAcao>
        <Button type="button" size="toque" className="flex-1" onClick={salvar} disabled={salvando}>
          {salvando ? 'Salvando…' : `Valer de ${MESES[ref_.mes - 1]} em diante`}
        </Button>
      </BarraAcao>

      <Dialog open={confirmando} onOpenChange={setConfirmando}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover a meta de {MESES[ref_.mes - 1]}?</DialogTitle>
            <DialogDescription>
              Os meses que dependiam dela voltam para a meta anterior. Se não houver
              nenhuma antes, ficam sem meta.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" size="toque" onClick={() => setConfirmando(false)}>
              Cancelar
            </Button>
            <Button type="button" size="toque" disabled={removendo} onClick={remover}>
              {removendo ? 'Removendo…' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
