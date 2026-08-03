'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, History, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { salvarMetas, removerMetasDoMes } from '@/lib/actions/escritorio'
import { proximaCompetencia } from '@/lib/engine/calendario'
import { parseBRLParaCentavos } from '@/lib/format'
import { CampoValor } from '@/components/campos'
import { AvatarInicial } from '@/components/ui/avatar-inicial'
import { Label } from '@/components/ui/label'
import { BarraAcao } from '@/components/ui/barra-acao'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function mesAtual(): { ano: number; mes: number } {
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
  const [ano, mes] = hoje.split('-').map(Number)
  return { ano, mes }
}

function emReais(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

function rotulo(vigenteDe: string): string {
  const [ano, mes] = vigenteDe.split('-').map(Number)
  return `${MESES[mes - 1]} de ${ano}`
}

type MetaVigente = { corretor_id: string | null; valor_centavos: number; vigente_de: string }

/**
 * Metas com vigência: o que se salva vale daquele mês em diante.
 *
 * Meta por mês, começando vazia, seria trabalho eterno — o dono teria que
 * abrir todo dia primeiro e digitar tudo de novo, e enquanto não digitasse o
 * painel ficaria sem barra, sem projeção e sem alerta. É o mesmo modelo da
 * política de comissão, que este produto já ensina: uma versão vale até a
 * próxima, e o passado não muda.
 */
export function MetasEscritorio({ membros }: {
  membros: { corretorId: string; nome: string }[]
}) {
  const [ref, setRef] = useState(mesAtual)

  /*
   * Duas leituras: o que VALE neste mês (podendo ter vindo de meses atrás) e
   * o que começa NELE. A primeira preenche o formulário; a segunda diz se
   * salvar é criar uma vigência nova ou corrigir a que já começa aqui.
   */
  const { data, isFetching } = useQuery({
    queryKey: ['metas-vigentes', ref.ano, ref.mes],
    queryFn: async () => {
      const supabase = createClient()
      const { data: escritorioId } = await supabase.rpc('meu_escritorio_como_dono')
      if (!escritorioId) throw new Error('nao_e_dono')
      const [vigentes, doMes] = await Promise.all([
        supabase.rpc('metas_vigentes', {
          p_escritorio: escritorioId, p_ano: ref.ano, p_mes: ref.mes,
        }),
        supabase.from('metas_escritorio')
          .select('corretor_id, valor_centavos, vigente_de')
          .eq('vigente_de', `${ref.ano}-${String(ref.mes).padStart(2, '0')}-01`),
      ])
      if (vigentes.error) throw vigentes.error
      if (doMes.error) throw doMes.error
      return {
        vigentes: (vigentes.data ?? []) as MetaVigente[],
        comecaAqui: (doMes.data ?? []).length > 0,
      }
    },
  })

  function mudarMes(direcao: -1 | 1) {
    setRef(base => direcao === 1
      ? proximaCompetencia(base)
      : base.mes === 1 ? { ano: base.ano - 1, mes: 12 } : { ano: base.ano, mes: base.mes - 1 })
  }

  return (
    <div className="coluna-formulario space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">A partir de</h2>
        <div className="flex items-center gap-0.5 rounded-full bg-card px-1 py-0.5 text-sm">
          <button onClick={() => mudarMes(-1)} aria-label="Mês anterior"
            className="rounded-full p-1.5 transition-colors hover:bg-muted">
            <ChevronLeft size={16} />
          </button>
          <span className="px-1 font-medium">{MESES[ref.mes - 1]} de {ref.ano}</span>
          <button onClick={() => mudarMes(1)} aria-label="Próximo mês"
            className="rounded-full p-1.5 transition-colors hover:bg-muted">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/*
        A key troca só quando os dados chegam, nunca durante o carregamento.
        Remontar a cada ida e volta de query fazia o formulário exibir o mês
        anterior enquanto o novo vinha — e salvar gravava aquele número no mês
        errado, espalhando a mesma meta por meses seguidos.
      */}
      {!data
        ? <div className="space-y-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
        : (
          <FormMetas
            key={`${ref.ano}-${ref.mes}`}
            ref_={ref} membros={membros}
            vigentes={data.vigentes} comecaAqui={data.comecaAqui}
            recarregando={isFetching}
          />
        )}
    </div>
  )
}

function FormMetas({ ref_, membros, vigentes, comecaAqui, recarregando }: {
  ref_: { ano: number; mes: number }
  membros: { corretorId: string; nome: string }[]
  vigentes: MetaVigente[]
  comecaAqui: boolean
  recarregando: boolean
}) {
  const ref = ref_
  const qc = useQueryClient()
  const casa = vigentes.find(m => m.corretor_id === null)
  const [casaTxt, setCasaTxt] = useState(casa ? emReais(Number(casa.valor_centavos)) : '')
  const [porCorretor, setPorCorretor] = useState<Record<string, string>>(
    Object.fromEntries(vigentes.filter(m => m.corretor_id)
      .map(m => [m.corretor_id!, emReais(Number(m.valor_centavos))])))
  const [salvando, setSalvando] = useState(false)
  const [removendo, setRemovendo] = useState(false)

  /*
   * Herdada: a meta veio de um mês anterior e este só está seguindo ela. Sem
   * dizer isso, o dono acharia que alguém cadastrou a meta para este mês e
   * não entenderia por que editar aqui muda também setembro e outubro.
   */
  const herdadaDe = !comecaAqui && vigentes.length > 0
    ? vigentes.map(m => m.vigente_de).sort().at(-1)!
    : null

  function invalidar() {
    qc.invalidateQueries({ queryKey: ['metas-vigentes'] })
    qc.invalidateQueries({ queryKey: ['painel-do-dono'] })
  }

  async function salvar() {
    setSalvando(true)
    const r = await salvarMetas(ref.ano, ref.mes, [
      { corretorId: null, valorCentavos: parseBRLParaCentavos(casaTxt) },
      ...membros.map(m => ({
        corretorId: m.corretorId,
        valorCentavos: parseBRLParaCentavos(porCorretor[m.corretorId] ?? ''),
      })),
    ])
    setSalvando(false)
    if (!r.ok) { toast.error(r.erro); return }
    toast.success(`Metas valendo de ${MESES[ref.mes - 1]} de ${ref.ano} em diante.`)
    invalidar()
  }

  async function remover() {
    setRemovendo(true)
    const r = await removerMetasDoMes(ref.ano, ref.mes)
    setRemovendo(false)
    if (!r.ok) { toast.error(r.erro); return }
    toast.success('Metas removidas. Vale de novo a vigência anterior.')
    invalidar()
  }

  return (
    <div className="coluna-formulario space-y-5">
      {herdadaDe && (
        <div className="flex items-start gap-2.5 rounded-lg bg-card px-3 py-2.5 text-sm">
          <History size={18} className="mt-0.5 shrink-0 text-muted-foreground" />
          <span className="text-muted-foreground">
            Estas metas vêm de <span className="font-medium text-foreground">{rotulo(herdadaDe)}</span> e
            seguem valendo. Salvar aqui cria uma vigência nova a partir de{' '}
            {MESES[ref.mes - 1]} — os meses anteriores não mudam.
          </span>
        </div>
      )}

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

      <p className="text-xs text-muted-foreground">
        A meta vale deste mês em diante, até você salvar outra. Campo vazio é meta
        que não existe.
      </p>

      {comecaAqui && (
        <Button type="button" variant="outline" size="sm" onClick={remover} disabled={removendo}
          className="self-start text-muted-foreground">
          <Trash2 size={16} /> {removendo ? 'Removendo…' : `Encerrar a vigência de ${MESES[ref.mes - 1]}`}
        </Button>
      )}

      <div className="flex-1" />
      <BarraAcao>
        <Button type="button" size="toque" className="flex-1" onClick={salvar}
          disabled={salvando || recarregando}>
          {salvando ? 'Salvando…' : `Valer de ${MESES[ref.mes - 1]} em diante`}
        </Button>
      </BarraAcao>
    </div>
  )
}
