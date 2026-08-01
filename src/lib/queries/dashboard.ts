'use client'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from './keys'

export type UltimaVenda = {
  id: string; cliente: string; valorCartaCentavos: number; comissaoPrevistaCentavos: number
}
/** O que cai no mês escolhido: a pergunta que o corretor abre o app para responder. */
export type PagamentoDoMes = {
  totalCentavos: number
  quantidade: number
  /** data do primeiro pagamento do mês (o escritório costuma pagar tudo no mesmo dia) */
  data: string
  /** já passou: o dinheiro entrou */
  jaCaiu: boolean
}

function hojeSP(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}

function ultimoDiaDoMes(ano: number, mes: number): string {
  const dia = new Date(Date.UTC(ano, mes, 0)).getUTCDate()
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

export function useDashboard(ano: number, mes: number) {
  return useQuery({
    queryKey: queryKeys.dashboard(ano, mes),
    // a competência só existe depois que a config chega; sem isso o painel
    // dispara três consultas com ano=0 a cada visita, uma delas devolvendo 400
    enabled: ano > 0 && mes > 0,
    queryFn: async () => {
      const supabase = createClient()
      const hoje = hojeSP()
      const primeiroDia = `${ano}-${String(mes).padStart(2, '0')}-01`
      const ultimoDia = ultimoDiaDoMes(ano, mes)

      const vazio = {
        totalVendidoCentavos: 0, nVendas: 0,
        comissaoPrevistaCentavos: 0, comissaoRecebidaCentavos: 0,
        comissaoPendenteCentavos: 0,
        proximos: [] as { id: string; vendaId: string; valor_centavos: number; data_prevista: string; cliente: string; jaCaiu: boolean }[],
        pagamentoDoMes: null as PagamentoDoMes | null,
        ultimasVendas: [] as UltimaVenda[],
      }

      // Tudo que cai no MÊS ESCOLHIDO — é o que o seletor de mês governa.
      // Parcela cancelada ou estornada não é dinheiro do corretor.
      const { data: doMes } = await supabase.from('recebimentos')
        .select('id, valor_centavos, data_prevista, status, comissoes(vendas(id, clientes(nome)))')
        .in('status', ['previsto', 'recebido'])
        .gte('data_prevista', primeiroDia).lte('data_prevista', ultimoDia)
        .order('data_prevista')

      const parcelas = doMes ?? []
      if (parcelas.length > 0) {
        const primeiraData = parcelas[0].data_prevista
        vazio.pagamentoDoMes = {
          totalCentavos: parcelas.reduce((s, p) => s + Number(p.valor_centavos), 0),
          quantidade: parcelas.length,
          data: primeiraData,
          jaCaiu: primeiraData <= hoje,
        }
        // um por lista: o painel dá a amostra, a lista inteira mora na tela
        // própria, a um toque de "Ver agenda"
        vazio.proximos = parcelas.slice(0, 1).map(p => {
          const venda = (p.comissoes as unknown as {
            vendas: { id: string; clientes: { nome: string } | null }
          }).vendas
          return {
            id: p.id, vendaId: venda.id,
            valor_centavos: Number(p.valor_centavos), data_prevista: p.data_prevista,
            cliente: venda.clientes?.nome ?? '',
            jaCaiu: p.data_prevista <= hoje,
          }
        })
      }

      const { data: comp } = await supabase.from('competencias')
        .select('id').eq('ano', ano).eq('mes', mes).maybeSingle()
      if (!comp) return vazio

      const { data: vendas } = await supabase.from('vendas')
        .select(`
          id, data_venda, valor_carta_centavos, status, clientes(nome),
          comissoes(valor_centavos, status, recebimentos(valor_centavos, data_prevista, status))
        `)
        .eq('competencia_id', comp.id)
        .order('data_venda', { ascending: false })

      const confirmadas = (vendas ?? []).filter(v => v.status === 'confirmada')
      const total = confirmadas.reduce((s, v) => s + Number(v.valor_carta_centavos), 0)
      let prevista = 0, recebida = 0
      for (const v of confirmadas) {
        const c = v.comissoes as unknown as {
          valor_centavos: number
          recebimentos: { valor_centavos: number; data_prevista: string; status: string }[]
        } | null
        if (!c) continue
        prevista += Number(c.valor_centavos)
        // "já recebi" não depende mais de marcação: o escritório paga no dia,
        // então a parcela cuja data chegou já entrou
        recebida += c.recebimentos
          .filter(r => r.status !== 'cancelado' && r.status !== 'estornado' && r.data_prevista <= hoje)
          .reduce((s, r) => s + Number(r.valor_centavos), 0)
      }

      return {
        ...vazio,
        totalVendidoCentavos: total, nVendas: confirmadas.length,
        comissaoPrevistaCentavos: prevista, comissaoRecebidaCentavos: recebida,
        comissaoPendenteCentavos: Math.max(0, prevista - recebida),
        ultimasVendas: confirmadas.slice(0, 1).map(v => {
          const c = v.comissoes as unknown as { valor_centavos: number } | null
          return {
            id: v.id,
            cliente: (v.clientes as { nome: string } | null)?.nome ?? '',
            valorCartaCentavos: Number(v.valor_carta_centavos),
            comissaoPrevistaCentavos: Number(c?.valor_centavos ?? 0),
          }
        }),
      }
    },
  })
}
