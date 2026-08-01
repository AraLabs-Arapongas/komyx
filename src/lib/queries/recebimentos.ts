'use client'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from './keys'

export type RecebimentoLinha = {
  id: string; numero_parcela: number; valor_centavos: number
  data_prevista: string; data_recebimento: string | null; status: string
  comissoes: { n_parcelas: number; vendas: { id: string; status: string; clientes: { nome: string } | null } }
}

export type ResumoAgenda = {
  aReceberCentavos: number
  recebidoCentavos: number
  total: number
  /** meses com movimento, em "YYYY-MM" — alimenta o filtro sem baixar as linhas */
  meses: string[]
}

function ultimoDiaDoMes(mes: string): string {
  const ano = Number(mes.slice(0, 4)), m = Number(mes.slice(5, 7))
  const dia = new Date(Date.UTC(ano, m, 0)).getUTCDate()
  return `${mes}-${String(dia).padStart(2, '0')}`
}

/**
 * Os dois números do topo e os meses do filtro, somados no banco.
 *
 * Antes isso saía de todas as parcelas carregadas no cliente, o que crescia a
 * cada ano de uso. Aqui não trafega linha nenhuma.
 */
export function useResumoAgenda(hoje: string, busca = '') {
  return useQuery({
    queryKey: queryKeys.resumoAgenda(busca),
    queryFn: async (): Promise<ResumoAgenda> => {
      const { data, error } = await createClient()
        .rpc('resumo_agenda', { p_hoje: hoje, p_busca: busca })
      if (error) throw error
      const r = data as unknown as {
        aReceberCentavos: number; recebidoCentavos: number; total: number; meses: string[]
      }
      return {
        aReceberCentavos: Number(r.aReceberCentavos),
        recebidoCentavos: Number(r.recebidoCentavos),
        total: Number(r.total),
        meses: r.meses ?? [],
      }
    },
  })
}

/**
 * A lista em si, paginada e recortada no banco. O mês escolhido vira filtro na
 * consulta em vez de peneira no cliente: sem isso o corretor baixa cinco anos
 * de parcelas para ver as do mês que vem.
 */
export function useRecebimentos({ mes = '', busca = '', limite = 50 }: {
  mes?: string; busca?: string; limite?: number
} = {}) {
  return useQuery({
    queryKey: queryKeys.recebimentos(mes, busca, limite),
    queryFn: async () => {
      const supabase = createClient()
      let q = supabase.from('recebimentos')
        // !inner até o cliente: cliente_id é not null, então nada some, e é o
        // que permite filtrar por nome através do join
        .select('id, numero_parcela, valor_centavos, data_prevista, data_recebimento, status, comissoes!inner(n_parcelas, vendas!inner(id, status, clientes!inner(nome)))')
        .order('data_prevista', { ascending: true })
        .limit(limite)

      if (mes) {
        q = q.gte('data_prevista', `${mes}-01`).lte('data_prevista', ultimoDiaDoMes(mes))
      }
      // o nome do cliente mora em outra tabela: o filtro precisa atravessar o
      // join, não o `.or()` da própria linha
      if (busca) q = q.ilike('comissoes.vendas.clientes.nome', `%${busca}%`)

      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as unknown as RecebimentoLinha[]
    },
  })
}
