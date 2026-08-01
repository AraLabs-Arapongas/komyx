'use client'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from './keys'

export type ProximoPagamento = { data: string; totalCentavos: number; quantidade: number }
export type UltimaVenda = {
  id: string; cliente: string; valorCartaCentavos: number; comissaoPrevistaCentavos: number
}

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
        proximoPagamento: null as ProximoPagamento | null,
        ultimasVendas: [] as UltimaVenda[],
      }
      // próximos recebimentos independem da competência selecionada
      const { data: prox } = await supabase.from('recebimentos')
        .select('id, valor_centavos, data_prevista, comissoes(vendas(clientes(nome)))')
        .eq('status', 'previsto').order('data_prevista').limit(5)
      vazio.proximos = (prox ?? []).map(p => ({
        id: p.id, valor_centavos: Number(p.valor_centavos), data_prevista: p.data_prevista,
        cliente: (p.comissoes as unknown as { vendas: { clientes: { nome: string } | null } })
          .vendas.clientes?.nome ?? '',
      }))
      // hero: soma dos recebimentos previstos da PRÓXIMA data de pagamento (não o total geral)
      const proximaData = vazio.proximos[0]?.data_prevista
      if (proximaData) {
        const { data: doDia } = await supabase.from('recebimentos')
          .select('valor_centavos')
          .eq('status', 'previsto').eq('data_prevista', proximaData)
        vazio.proximoPagamento = {
          data: proximaData,
          totalCentavos: (doDia ?? []).reduce((s, r) => s + Number(r.valor_centavos), 0),
          quantidade: (doDia ?? []).length,
        }
      }
      if (!comp) return vazio

      const { data: vendas } = await supabase.from('vendas')
        .select(`
          id, data_venda, valor_carta_centavos, status, clientes(nome),
          comissoes(valor_centavos, status, recebimentos(valor_centavos, status))
        `)
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
      const ultimasVendas: UltimaVenda[] = [...confirmadas]
        .sort((a, b) => b.data_venda.localeCompare(a.data_venda))
        .slice(0, 5)
        .map(v => {
          const c = v.comissoes as unknown as { valor_centavos: number } | null
          return {
            id: v.id,
            cliente: (v.clientes as unknown as { nome: string } | null)?.nome ?? '',
            valorCartaCentavos: Number(v.valor_carta_centavos),
            comissaoPrevistaCentavos: c ? Number(c.valor_centavos) : 0,
          }
        })
      return {
        ...vazio,
        totalVendidoCentavos: total, nVendas: confirmadas.length,
        ticketMedioCentavos: confirmadas.length ? Math.round(total / confirmadas.length) : 0,
        comissaoPrevistaCentavos: prevista, comissaoRecebidaCentavos: recebida,
        comissaoPendenteCentavos: Math.max(0, prevista - recebida),
        ultimasVendas,
      }
    },
  })
}
