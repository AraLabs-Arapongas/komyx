'use client'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export type CotaAtiva = {
  vendaId: string
  cliente: string
  grupo: string
  cota: string
  administradora: string
}

/**
 * As cotas que ainda estão de pé, para conferir contra o sorteio.
 *
 * Só vendas confirmadas: cota cancelada ou de cliente que desistiu não
 * concorre, e avisar que ela "foi sorteada" seria pior que não avisar nada.
 */
export function useCotasAtivas() {
  return useQuery({
    queryKey: ['cotas-ativas'],
    queryFn: async (): Promise<CotaAtiva[]> => {
      const { data, error } = await createClient().from('vendas')
        .select('id, grupo, cota, administradora, clientes!inner(nome)')
        .eq('status', 'confirmada')
      if (error) throw error
      return (data ?? []).map(v => ({
        vendaId: v.id,
        cliente: (v.clientes as unknown as { nome: string }).nome,
        grupo: v.grupo,
        cota: v.cota,
        administradora: v.administradora,
      }))
    },
  })
}
