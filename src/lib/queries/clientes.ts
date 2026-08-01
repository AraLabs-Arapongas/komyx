'use client'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from './keys'

export type ClienteResumo = {
  id: string; nome: string; telefone: string | null
  vendas: { count: number }[]
}

export function useClientesLista(busca = '') {
  return useQuery({
    queryKey: queryKeys.clientes(busca),
    queryFn: async () => {
      const supabase = createClient()
      const buscaLimpa = busca.trim()
      let q = supabase.from('clientes')
        .select('id, nome, telefone, vendas(count)')
        .order('nome')
      if (buscaLimpa) q = q.ilike('nome', `%${buscaLimpa}%`)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as unknown as ClienteResumo[]
    },
  })
}

export type Cliente = {
  id: string; nome: string; telefone: string | null; documento: string | null
  observacoes: string | null; email: string | null; cidade: string | null; created_at: string
}

export function useCliente(id: string) {
  return useQuery({
    queryKey: ['cliente', id] as const,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from('clientes').select('*').eq('id', id).single()
      if (error) throw error
      return data as Cliente
    },
    enabled: !!id,
  })
}

export type VendaDoCliente = {
  id: string; valor_carta_centavos: number; status: string; data_venda: string
  comissoes: { valor_centavos: number; status: string } | null
}

export function useVendasDoCliente(clienteId: string) {
  return useQuery({
    queryKey: ['vendas-do-cliente', clienteId] as const,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from('vendas')
        .select('id, valor_carta_centavos, status, data_venda, comissoes(valor_centavos, status)')
        .eq('cliente_id', clienteId)
        .order('data_venda', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as VendaDoCliente[]
    },
    enabled: !!clienteId,
  })
}
