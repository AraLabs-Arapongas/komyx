'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { salvarMetas } from '@/lib/actions/escritorio'
import { proximaCompetencia } from '@/lib/engine/calendario'
import { parseBRLParaCentavos } from '@/lib/format'
import { CampoValor } from '@/components/campos'
import { AvatarInicial } from '@/components/ui/avatar-inicial'
import { Label } from '@/components/ui/label'
import { BarraAcao } from '@/components/ui/barra-acao'
import { Button } from '@/components/ui/button'

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

/**
 * Formulário de metas de um mês: a da casa em cima, uma por corretor embaixo.
 *
 * Campo vazio é meta que não existe — zerar e salvar apaga a linha. O painel
 * só mostra progresso de quem tem meta, então não há estado "meta zero".
 */
export function MetasEscritorio({ membros }: {
  membros: { corretorId: string; nome: string }[]
}) {
  const [ref, setRef] = useState(mesAtual)

  /*
   * As metas gravadas viram valor INICIAL do formulário, não estado dele: o
   * bloco de edição remonta pela `key` quando o mês (ou a resposta) muda, e o
   * corretor edita a partir do que está salvo. Sem efeito copiando query para
   * estado — é a mesma razão do useSyncExternalStore no modo privacidade.
   */
  const { data: salvas, isLoading } = useQuery({
    queryKey: ['metas-escritorio', ref.ano, ref.mes],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from('metas_escritorio')
        .select('corretor_id, valor_centavos').eq('ano', ref.ano).eq('mes', ref.mes)
      if (error) throw error
      return data ?? []
    },
  })

  function mudarMes(direcao: -1 | 1) {
    setRef(base => direcao === 1
      ? proximaCompetencia(base)
      : base.mes === 1 ? { ano: base.ano - 1, mes: 12 } : { ano: base.ano, mes: base.mes - 1 })
  }

  const casa = salvas?.find(m => m.corretor_id === null)
  const iniciais = {
    casa: casa ? emReais(Number(casa.valor_centavos)) : '',
    porCorretor: Object.fromEntries((salvas ?? []).filter(m => m.corretor_id)
      .map(m => [m.corretor_id!, emReais(Number(m.valor_centavos))])),
  }

  return (
    <div className="coluna-formulario space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Mês da meta</h2>
        <div className="flex items-center gap-0.5 rounded-full bg-card px-1 py-0.5 text-sm">
          <button onClick={() => mudarMes(-1)} aria-label="Mês anterior"
            className="rounded-full p-1.5 hover:bg-muted">
            <ChevronLeft size={16} />
          </button>
          <span className="px-1 font-medium">{MESES[ref.mes - 1]} de {ref.ano}</span>
          <button onClick={() => mudarMes(1)} aria-label="Próximo mês"
            className="rounded-full p-1.5 hover:bg-muted">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <FormMetas key={`${ref.ano}-${ref.mes}-${isLoading}`} ref_={ref}
        membros={membros} iniciais={iniciais} carregando={isLoading} />
    </div>
  )
}

function FormMetas({ ref_, membros, iniciais, carregando }: {
  ref_: { ano: number; mes: number }
  membros: { corretorId: string; nome: string }[]
  iniciais: { casa: string; porCorretor: Record<string, string> }
  carregando: boolean
}) {
  const ref = ref_
  const qc = useQueryClient()
  const [casaTxt, setCasaTxt] = useState(iniciais.casa)
  const [porCorretor, setPorCorretor] = useState<Record<string, string>>(iniciais.porCorretor)
  const [salvando, setSalvando] = useState(false)

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
    toast.success(`Metas de ${MESES[ref.mes - 1]} salvas.`)
    // o painel mostra as barras de meta: sem invalidar, ele exibiria as antigas
    qc.invalidateQueries({ queryKey: ['metas-escritorio', ref.ano, ref.mes] })
    qc.invalidateQueries({ queryKey: ['painel-escritorio', ref.ano, ref.mes] })
  }

  return (
    <div className="coluna-formulario space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="meta-casa">Meta do escritório</Label>
        <CampoValor id="meta-casa" value={casaTxt} onChange={setCasaTxt}
          disabled={carregando} placeholder="0,00" />
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Por corretor</h2>
        {membros.map(m => (
          <div key={m.corretorId} className="flex items-center gap-3">
            <AvatarInicial nome={m.nome} />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{m.nome}</span>
            <CampoValor value={porCorretor[m.corretorId] ?? ''} disabled={carregando}
              onChange={v => setPorCorretor(prev => ({ ...prev, [m.corretorId]: v }))}
              className="max-w-[11rem]" placeholder="0,00" />
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Campo vazio é meta que não existe: zere e salve para apagar.
      </p>

      <div className="flex-1" />
      <BarraAcao>
        <Button type="button" size="toque" className="flex-1" onClick={salvar}
          disabled={salvando || carregando}>
          {salvando ? 'Salvando…' : 'Salvar metas'}
        </Button>
      </BarraAcao>
    </div>
  )
}
