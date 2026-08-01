'use client'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from './keys'

export type VendaStatusFiltro = 'todas' | 'confirmada' | 'cancelada' | 'estornada'
export type VendaOrdenacao = 'recentes' | 'valor' | 'comissao'

type VendaListaRow = {
  id: string
  valor_carta_centavos: number
  administradora: string
  grupo: string
  cota: string
  numero_contrato: string | null
  tags: string[]
  observacoes: string | null
  data_venda: string
  status: string
  clientes: { nome: string } | null
  comissoes: {
    valor_centavos: number; percentual: number; status: string
    recebimentos: { data_prevista: string; status: string }[]
  } | null
}

const SELECT_VENDAS_LISTA =
  'id, valor_carta_centavos, administradora, grupo, cota, numero_contrato, tags, observacoes, data_venda, status, clientes(nome), comissoes(valor_centavos, percentual, status, recebimentos(data_prevista, status))'

export function useVendas(opts: {
  busca?: string
  status?: VendaStatusFiltro
  ordenacao?: VendaOrdenacao
  limite?: number
} = {}) {
  const { busca = '', status = 'todas', ordenacao = 'recentes', limite = 20 } = opts
  return useQuery({
    queryKey: [...queryKeys.vendas(busca), status, ordenacao, limite] as const,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const supabase = createClient()
      const b = busca.replace(/[,()%]/g, ' ').trim()

      function base(select: string) {
        let q = supabase.from('vendas').select(select, { count: 'exact' })
        if (status !== 'todas') q = q.eq('status', status)
        if (ordenacao === 'valor') {
          q = q.order('valor_carta_centavos', { ascending: false })
        } else {
          // "maior comissão" também entra aqui: o PostgREST só ordena DENTRO de
          // uma tabela relacionada, não a lista por ela. Como comissão é 1:1 com
          // a venda, isso não ordenaria nada — a ordem sai logo abaixo, em JS.
          q = q.order('data_venda', { ascending: false }).order('created_at', { ascending: false })
        }
        return q.limit(limite)
      }

      let lista: VendaListaRow[]
      let total: number

      if (b) {
        // Busca por nome de cliente exige uma segunda consulta: o `.or()`
        // abaixo roda sobre colunas da própria tabela `vendas` e não alcança
        // `clientes.nome` (mesmo padrão de src/components/busca-global.tsx).
        // As duas listas são unidas por id para não haver duplicatas.
        const porCampos = base(SELECT_VENDAS_LISTA).or(
          `grupo.ilike.%${b}%,cota.ilike.%${b}%,administradora.ilike.%${b}%,numero_contrato.ilike.%${b}%,observacoes.ilike.%${b}%`,
        )
        const porNomeCliente = base(SELECT_VENDAS_LISTA.replace('clientes(nome)', 'clientes!inner(nome)'))
          .ilike('clientes.nome', `%${b}%`)
        const [resCampos, resNome] = await Promise.all([porCampos, porNomeCliente])
        if (resCampos.error) throw resCampos.error
        if (resNome.error) throw resNome.error

        const mapa = new Map<string, VendaListaRow>()
        for (const v of [...(resCampos.data ?? []), ...(resNome.data ?? [])] as unknown as VendaListaRow[]) {
          mapa.set(v.id, v)
        }
        lista = [...mapa.values()]
        // total exibido: a soma das duas contagens é só um teto, já que pode
        // haver sobreposição entre as duas buscas. Quando a união cabe
        // inteira dentro do que já foi buscado (nenhuma das duas bateu no
        // limite), o tamanho da união é exato; senão, usamos a soma como
        // estimativa por cima, para não esconder "carregar mais" à toa.
        const nenhumaTruncada = (resCampos.data?.length ?? 0) < limite && (resNome.data?.length ?? 0) < limite
        total = nenhumaTruncada ? mapa.size : (resCampos.count ?? 0) + (resNome.count ?? 0)
      } else {
        const { data, error, count } = await base(SELECT_VENDAS_LISTA)
        if (error) throw error
        lista = (data ?? []) as unknown as VendaListaRow[]
        total = count ?? lista.length
      }

      if (ordenacao === 'comissao') {
        const comissaoDe = (v: VendaListaRow) => Number(v.comissoes?.valor_centavos ?? 0)
        lista = [...lista].sort((a, b) => comissaoDe(b) - comissaoDe(a))
      }
      return { itens: lista, total }
    },
  })
}

export function useVenda(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.venda(id),
    enabled: (options?.enabled ?? true) && !!id,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from('vendas')
        .select('*, clientes(id, nome, telefone), comissoes(*, recebimentos(*)), competencias(ano, mes)')
        .eq('id', id).single()
      if (error) throw error
      return data
    },
  })
}

export type EventoVenda = {
  id: string
  acao: 'criou' | 'alterou' | 'removeu'
  antes: Record<string, unknown> | null
  depois: Record<string, unknown> | null
  criado_em: string
}

/** Histórico de alterações da venda, mais recente primeiro. */
export function useEventosVenda(vendaId: string) {
  return useQuery({
    queryKey: ['eventos', 'vendas', vendaId] as const,
    enabled: !!vendaId,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from('eventos')
        .select('id, acao, antes, depois, criado_em')
        .eq('entidade', 'vendas').eq('entidade_id', vendaId)
        .order('criado_em', { ascending: false })
      if (error) throw error
      return (data ?? []) as EventoVenda[]
    },
  })
}

export function useClientes(busca = '') {
  return useQuery({
    queryKey: queryKeys.clientes(busca),
    queryFn: async () => {
      const supabase = createClient()
      let q = supabase.from('clientes').select('id, nome, telefone').order('nome').limit(20)
      if (busca) q = q.ilike('nome', `%${busca}%`)
      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
  })
}
