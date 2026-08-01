'use client'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from './keys'

export function useDashboard(ano: number, mes: number) {
  return useQuery({
    queryKey: queryKeys.dashboard(ano, mes),
    queryFn: async () => {
      const supabase = createClient()
      const { data: comp } = await supabase.from('competencias')
        .select('id').eq('ano', ano).eq('mes', mes).maybeSingle()
      const vazio = {
        totalVendidoCentavos: 0, nVendas: 0, ticketMedioCentavos: 0,
        comissaoPrevistaCentavos: 0, comissaoRecebidaCentavos: 0,
        comissaoPendenteCentavos: 0,
        proximos: [] as { id: string; valor_centavos: number; data_prevista: string; cliente: string }[],
      }
      // próximos recebimentos independem da competência
      const { data: prox } = await supabase.from('recebimentos')
        .select('id, valor_centavos, data_prevista, comissoes(vendas(clientes(nome)))')
        .eq('status', 'previsto').order('data_prevista').limit(5)
      vazio.proximos = (prox ?? []).map(p => ({
        id: p.id, valor_centavos: Number(p.valor_centavos), data_prevista: p.data_prevista,
        cliente: (p.comissoes as unknown as { vendas: { clientes: { nome: string } | null } })
          .vendas.clientes?.nome ?? '',
      }))
      if (!comp) return vazio

      const { data: vendas } = await supabase.from('vendas')
        .select('valor_carta_centavos, status, comissoes(valor_centavos, status, recebimentos(valor_centavos, status))')
        .eq('competencia_id', comp.id)
      const confirmadas = (vendas ?? []).filter(v => v.status === 'confirmada')
      const total = confirmadas.reduce((s, v) => s + Number(v.valor_carta_centavos), 0)
      let prevista = 0, recebida = 0
      for (const v of confirmadas) {
        const c = v.comissoes as unknown as
          { valor_centavos: number; recebimentos: { valor_centavos: number; status: string }[] } | null
        if (!c) continue
        prevista += Number(c.valor_centavos)
        recebida += c.recebimentos
          .filter(r => r.status === 'recebido')
          .reduce((s, r) => s + Number(r.valor_centavos), 0)
      }
      return {
        ...vazio,
        totalVendidoCentavos: total, nVendas: confirmadas.length,
        ticketMedioCentavos: confirmadas.length ? Math.round(total / confirmadas.length) : 0,
        comissaoPrevistaCentavos: prevista, comissaoRecebidaCentavos: recebida,
        comissaoPendenteCentavos: Math.max(0, prevista - recebida),
      }
    },
  })
}
