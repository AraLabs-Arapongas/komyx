import { Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { configEfetiva } from '@/lib/actions/recalcular'
import { ConfigForm } from '@/components/config-form'
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina'
import type { Faixa, PoliticaEstorno } from '@/lib/domain/types'

export default async function ConfiguracaoPage() {
  const supabase = await createClient()
  // a PESSOAL, para editar — e a efetiva, para avisar quando a pessoal não é
  // a que está valendo
  const [{ data: cfg }, efetiva] = await Promise.all([
    supabase.from('config_financeira')
      .select('*').eq('ativa', true).is('escritorio_id', null).maybeSingle(),
    configEfetiva(supabase),
  ])
  const politicaDoEscritorio = efetiva?.escritorio_id != null
  return (
    <div className="coluna-formulario space-y-6 md:min-h-0">
      <CabecalhoPagina voltarPara="/app/perfil" titulo="Ajustes"
        apoio="Como seu escritório calcula e paga sua comissão."
        aviso="Alterações valem para as próximas vendas. O mês em aberto será recalculado com as novas regras; meses já fechados não mudam." />
      {politicaDoEscritorio && (
        /* a edição continua possível: se um dia sair do escritório, é esta
           config que volta a valer — mas quem edita precisa saber que hoje
           ela está dormindo */
        <div className="flex items-start gap-2.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm">
          <Building2 size={18} className="mt-0.5 shrink-0 text-primary" />
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">Sua comissão é definida pelo escritório.</span>{' '}
            As regras abaixo são as suas próprias e só voltam a valer se você sair da equipe.
          </span>
        </div>
      )}
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
