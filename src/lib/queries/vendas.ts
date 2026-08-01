'use client'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from './keys'

export type VendaStatusFiltro = 'todas' | 'confirmada' | 'cancelada' | 'estornada'
export type VendaOrdenacao = 'recentes' | 'valor' | 'comissao'

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
      let q = supabase.from('vendas')
        .select(
          'id, valor_carta_centavos, administradora, grupo, cota, numero_contrato, tags, observacoes, data_venda, status, clientes(nome), comissoes(valor_centavos, percentual, status, recebimentos(data_prevista, status))',
          { count: 'exact' },
        )
      if (status !== 'todas') q = q.eq('status', status)
      if (busca) {
        const b = busca.replace(/[,()%]/g, ' ').trim()
        if (b) {
          q = q.or(
            `grupo.ilike.%${b}%,cota.ilike.%${b}%,administradora.ilike.%${b}%,numero_contrato.ilike.%${b}%,observacoes.ilike.%${b}%`,
          )
        }
      }
      if (ordenacao === 'valor') {
        q = q.order('valor_carta_centavos', { ascending: false })
      } else {
        // "maior comissão" também entra aqui: o PostgREST só ordena DENTRO de
        // uma tabela relacionada, não a lista por ela. Como comissão é 1:1 com
        // a venda, isso não ordenaria nada — a ordem sai logo abaixo, em JS.
        q = q.order('data_venda', { ascending: false }).order('created_at', { ascending: false })
      }
      q = q.limit(limite)
      const { data, error, count } = await q
      if (error) throw error
      let lista = data ?? []
      const total = count ?? lista.length
      if (ordenacao === 'comissao') {
        const comissaoDe = (v: (typeof lista)[number]) =>
          Number((v.comissoes as { valor_centavos: number } | null)?.valor_centavos ?? 0)
        lista = [...lista].sort((a, b) => comissaoDe(b) - comissaoDe(a))
      }
      if (!busca) return { itens: lista, total }
      // busca por nome de cliente: filtro client-side (MVP) — os demais campos
      // já foram filtrados no servidor, então nenhuma linha é perdida aqui.
      const b = busca.toLowerCase()
      const itens = lista.filter(v =>
        (v.clientes as { nome: string } | null)?.nome.toLowerCase().includes(b) ||
        v.grupo.toLowerCase().includes(b) ||
        v.cota.toLowerCase().includes(b) ||
        v.administradora.toLowerCase().includes(b) ||
        (v.numero_contrato ?? '').toLowerCase().includes(b) ||
        (v.observacoes ?? '').toLowerCase().includes(b))
      return { itens, total }
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
