'use client'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from './keys'

export function useVendas(busca = '') {
  return useQuery({
    queryKey: queryKeys.vendas(busca),
    queryFn: async () => {
      const supabase = createClient()
      let q = supabase.from('vendas')
        .select('id, valor_carta_centavos, administradora, grupo, cota, data_venda, status, clientes(nome), comissoes(valor_centavos, percentual, status, recebimentos(data_prevista, status))')
        .order('data_venda', { ascending: false }).limit(100)
      if (busca) {
        const b = busca.replace(/[,()%]/g, ' ').trim()
        if (b) q = q.or(`grupo.ilike.%${b}%,cota.ilike.%${b}%,administradora.ilike.%${b}%`)
      }
      const { data, error } = await q
      if (error) throw error
      // busca por nome de cliente: filtro client-side (MVP)
      const lista = data ?? []
      if (!busca) return lista
      const b = busca.toLowerCase()
      return lista.filter(v =>
        (v.clientes as { nome: string } | null)?.nome.toLowerCase().includes(b) ||
        v.grupo.toLowerCase().includes(b) || v.cota.toLowerCase().includes(b) ||
        v.administradora.toLowerCase().includes(b))
    },
  })
}

export function useVenda(id: string) {
  return useQuery({
    queryKey: queryKeys.venda(id),
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from('vendas')
        .select('*, clientes(id, nome, telefone), comissoes(*, recebimentos(*))')
        .eq('id', id).single()
      if (error) throw error
      return data
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
