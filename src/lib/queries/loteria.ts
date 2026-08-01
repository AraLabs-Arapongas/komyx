'use client'
import { useQuery } from '@tanstack/react-query'
import type { ResultadoFederal } from '@/app/api/loteria-federal/route'

/**
 * O sorteio da Federal sai quarta e sábado à noite. Uma hora de validade é
 * folgada e a rota já é servida do cache da borda — isto aqui só evita refetch
 * a cada troca de tela.
 *
 * `retry: false`: fonte de apoio. Se a Caixa não responder, a seção some do
 * painel em silêncio; insistir só gastaria requisição.
 */
export function useLoteriaFederal() {
  return useQuery({
    queryKey: ['loteria-federal'],
    staleTime: 60 * 60 * 1000,
    retry: false,
    queryFn: async (): Promise<ResultadoFederal> => {
      const r = await fetch('/api/loteria-federal')
      if (!r.ok) throw new Error('indisponivel')
      return r.json()
    },
  })
}
