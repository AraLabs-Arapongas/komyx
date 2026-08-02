'use client'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export type ClienteResumo = {
  id: string; nome: string; telefone: string | null; cidade: string | null
  nVendas: number
  /** soma das cartas — patrimônio movimentado, não dinheiro do corretor */
  volumeCentavos: number
  /** o que essas vendas geraram de comissão: este sim é dinheiro dele */
  comissaoCentavos: number
}

type LinhaCliente = {
  id: string; nome: string; telefone: string | null; cidade: string | null
  vendas: {
    valor_carta_centavos: number
    status: string
    comissoes: { valor_centavos: number } | null
  }[]
}

export function useClientesLista(busca = '') {
  return useQuery({
    // Chave própria: `queryKeys.clientes(busca)` também é usada pelo
    // seletor de cliente em src/lib/queries/vendas.ts (useClientes), com um
    // formato de retorno diferente (sem contagem de vendas). Compartilhar a
    // chave fazia a tela de Clientes reaproveitar o cache do seletor e
    // mostrar "0 vendas" para todo mundo.
    queryKey: ['clientes-lista', busca] as const,
    queryFn: async (): Promise<ClienteResumo[]> => {
      const supabase = createClient()
      const buscaLimpa = busca.trim()
      /*
       * Traz as vendas em vez de só contá-las: a lista de clientes existe para
       * responder quem rende, e sem a comissão ela é uma agenda de telefones.
       * A carteira de um corretor tem dezenas de nomes, não milhares — cabe
       * somar aqui e evita uma view só para isto.
       */
      let q = supabase.from('clientes')
        .select('id, nome, telefone, cidade, vendas(valor_carta_centavos, status, comissoes(valor_centavos))')
        .order('nome')
      if (buscaLimpa) q = q.ilike('nome', `%${buscaLimpa}%`)
      const { data, error } = await q
      if (error) throw error

      return ((data ?? []) as unknown as LinhaCliente[]).map(c => {
        // venda cancelada ou estornada não conta: ela não rendeu nada
        const validas = (c.vendas ?? []).filter(v => v.status === 'confirmada')
        return {
          id: c.id, nome: c.nome, telefone: c.telefone, cidade: c.cidade,
          nVendas: validas.length,
          volumeCentavos: validas.reduce((s, v) => s + Number(v.valor_carta_centavos), 0),
          comissaoCentavos: validas.reduce((s, v) => s + Number(v.comissoes?.valor_centavos ?? 0), 0),
        }
      })
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
