'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from './keys'
import { marcarRecebido, desmarcarRecebido } from '@/lib/actions/vendas'
import { toast } from 'sonner'

export type RecebimentoLinha = {
  id: string; numero_parcela: number; valor_centavos: number
  data_prevista: string; data_recebimento: string | null; status: string
  comissoes: { n_parcelas: number; vendas: { id: string; status: string; clientes: { nome: string } | null } }
}

export function useRecebimentos() {
  return useQuery({
    queryKey: queryKeys.recebimentos,
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from('recebimentos')
        .select('id, numero_parcela, valor_centavos, data_prevista, data_recebimento, status, comissoes(n_parcelas, vendas(id, status, clientes(nome)))')
        .order('data_prevista', { ascending: true })
      if (error) throw error
      return (data ?? []) as unknown as RecebimentoLinha[]
    },
  })
}

export function useMarcarRecebido() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: string }) => marcarRecebido(id, data),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: queryKeys.recebimentos })
      const anterior = qc.getQueryData<RecebimentoLinha[]>(queryKeys.recebimentos)
      qc.setQueryData<RecebimentoLinha[]>(queryKeys.recebimentos, old =>
        (old ?? []).map(r => r.id === id ? { ...r, status: 'recebido' } : r))
      return { anterior }
    },
    onError: (_e, _v, ctx) => {
      qc.setQueryData(queryKeys.recebimentos, ctx?.anterior)
      toast.error('Não foi possível registrar o recebimento. Tente novamente.')
    },
    onSuccess: (r) => {
      if (!r.ok) { toast.error(r.erro); qc.invalidateQueries(); return }
      toast.success('Recebimento atualizado.')
    },
    onSettled: () => qc.invalidateQueries(),
  })
}

export function useDesmarcarRecebido() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string }) => desmarcarRecebido(id),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: queryKeys.recebimentos })
      const anterior = qc.getQueryData<RecebimentoLinha[]>(queryKeys.recebimentos)
      qc.setQueryData<RecebimentoLinha[]>(queryKeys.recebimentos, old =>
        (old ?? []).map(r => r.id === id ? { ...r, status: 'previsto', data_recebimento: null } : r))
      return { anterior }
    },
    onError: (_e, _v, ctx) => {
      qc.setQueryData(queryKeys.recebimentos, ctx?.anterior)
      toast.error('Não foi possível desfazer o recebimento. Tente novamente.')
    },
    onSuccess: (r) => {
      if (!r.ok) { toast.error(r.erro); qc.invalidateQueries(); return }
      toast.success('Recebimento desfeito.')
    },
    onSettled: () => qc.invalidateQueries(),
  })
}
