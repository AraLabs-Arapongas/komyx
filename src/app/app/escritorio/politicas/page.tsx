import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina'
import { PoliticasEscritorio, type PoliticaResumo } from '@/components/escritorio/politicas'
import type { Faixa, PoliticaEstorno } from '@/lib/domain/types'

/**
 * As políticas de comissão do escritório, só para o dono.
 *
 * Uma geral, que vale para a equipe inteira, e específicas por corretor, que
 * vencem a geral. Enquanto nenhuma existir, cada corretor segue com as regras
 * que ele mesmo configurou — o Enterprise não confisca nada por padrão.
 */
export default async function PoliticasPage() {
  const supabase = await createClient()
  const { data: escritorioId } = await supabase.rpc('meu_escritorio_como_dono')
  if (!escritorioId) redirect('/app/escritorio')

  const [{ data: politicas }, { data: membros }] = await Promise.all([
    supabase.from('config_financeira')
      .select('*').eq('escritorio_id', escritorioId).eq('ativa', true),
    supabase.rpc('membros_do_escritorio'),
  ])

  const resumo = (politicas ?? []).map((p): PoliticaResumo => ({
    aplicaA: p.aplica_a,
    faixaPorEscritorio: p.faixa_por_escritorio,
    inicial: {
      nomePolitica: p.nome_politica,
      faixas: (p.faixas as Faixa[]).map(f => ({
        max: f.max, percentual: f.percentual, parcelas: f.parcelas,
        distribuicao: f.distribuicao ?? null,
      })),
      diaFechamento: p.dia_fechamento,
      diaPrimeiroPagamento: p.dia_primeiro_pagamento,
      politicaEstorno: (p.politica_estorno ?? 'perguntar') as PoliticaEstorno,
    },
  }))

  const ativos = (membros ?? [])
    .filter(m => !m.saiu_em)
    .map(m => ({ corretorId: m.corretor_id, nome: m.nome, papel: m.papel as 'dono' | 'corretor' }))

  return (
    <div className="coluna-formulario space-y-6 md:min-h-0">
      <CabecalhoPagina voltarPara="/app/escritorio" titulo="Políticas de comissão"
        apoio="Como o escritório paga a equipe: uma regra para todos, ou uma por corretor."
        aviso="A política do escritório vence a configuração própria de cada corretor. Os números de quem já está no mês aberto são recalculados na próxima vez que cada um abrir o app." />
      <PoliticasEscritorio politicas={resumo} membros={ativos} />
    </div>
  )
}
