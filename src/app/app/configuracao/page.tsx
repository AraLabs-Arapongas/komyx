import { createClient } from '@/lib/supabase/server'
import { ConfigForm } from '@/components/config-form'
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina'
import type { Faixa, PoliticaEstorno } from '@/lib/domain/types'

export default async function ConfiguracaoPage() {
  const supabase = await createClient()
  const { data: cfg } = await supabase.from('config_financeira')
    .select('*').eq('ativa', true).maybeSingle()

  return (
    <div className="coluna-formulario space-y-6 md:min-h-0">
      <CabecalhoPagina voltarPara="/app/perfil" titulo="Ajustes"
        apoio="Como seu escritório calcula e paga sua comissão."
        aviso="Alterações valem para as próximas vendas. O mês em aberto será recalculado com as novas regras; meses já fechados não mudam." />
      {cfg && (
        <ConfigForm modo="edicao" inicial={{
          nomePolitica: cfg.nome_politica,
          faixas: (cfg.faixas as Faixa[]).map(f => ({ max: f.max, percentual: f.percentual, parcelas: f.parcelas, distribuicao: f.distribuicao ?? null })),
          diaFechamento: cfg.dia_fechamento,
          diaPrimeiroPagamento: cfg.dia_primeiro_pagamento,
          politicaEstorno: (cfg.politica_estorno ?? 'perguntar') as PoliticaEstorno,
        }} />
      )}
    </div>
  )
}
