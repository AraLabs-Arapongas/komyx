'use client'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useLoteriaFederal } from './loteria'
import { conferirCota } from '@/lib/engine/sorteio'

export type CotaAtiva = {
  vendaId: string
  /** null na venda registrada às pressas, que ainda não tem cliente */
  cliente: string | null
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
      // join solto, não `clientes!inner`: com inner, a venda sem cliente sairia
      // da conferência e o corretor não seria avisado de que ela foi sorteada
      const { data, error } = await createClient().from('vendas')
        .select('id, grupo, cota, administradora, clientes(nome)')
        .eq('status', 'confirmada')
      if (error) throw error
      return (data ?? []).map(v => ({
        vendaId: v.id,
        cliente: (v.clientes as unknown as { nome: string } | null)?.nome ?? null,
        grupo: v.grupo,
        cota: v.cota,
        administradora: v.administradora,
      }))
    },
  })
}

/**
 * As cotas do corretor que batem com a extração, agrupadas por prêmio.
 *
 * Mora aqui, e não na tela, porque duas partes precisam da mesma resposta: o
 * cartão da Federal, que marca o número, e o painel, que celebra ao abrir.
 */
export function useCotasSorteadas() {
  const { data: extracao, isLoading: carregandoExtracao } = useLoteriaFederal()
  const { data: cotas, isLoading: carregandoCotas } = useCotasAtivas()

  const porPremio = new Map<number, CotaAtiva[]>()
  if (extracao && cotas) {
    for (const cota of cotas) {
      for (const acerto of conferirCota(cota.cota, extracao.bilhetes)) {
        porPremio.set(acerto.premio, [...(porPremio.get(acerto.premio) ?? []), cota])
      }
    }
  }

  return {
    porPremio,
    /** identifica a extração: é por ela que a comemoração acontece uma vez só */
    concurso: extracao?.concurso ?? null,
    temSorteada: porPremio.size > 0,
    /* verdadeiro até a conferência estar completa. Mostrar os bilhetes antes
       disso faria o marcador de cota sorteada piscar depois, sobre um número
       que o corretor já estava lendo. */
    carregando: carregandoExtracao || carregandoCotas,
  }
}
