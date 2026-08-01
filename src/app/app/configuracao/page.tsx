import { createClient } from '@/lib/supabase/server'
import { ConfigForm } from '@/components/config-form'
import { sair } from '@/app/(auth)/actions'
import { Button } from '@/components/ui/button'
import type { Faixa } from '@/lib/domain/types'

export default async function ConfiguracaoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: cfg } = await supabase.from('config_financeira')
    .select('*').eq('ativa', true).single()
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Ajustes</h1>
      <div className="rounded-[10px] border border-[#F59E0B]/40 bg-[#F59E0B]/10 p-3 text-sm">
        Alterações valem para as próximas vendas. O mês em aberto será recalculado
        com as novas regras; meses já fechados não mudam.
      </div>
      {cfg && (
        <ConfigForm modo="edicao" inicial={{
          nomePolitica: cfg.nome_politica,
          faixas: (cfg.faixas as Faixa[]).map(f => ({ max: f.max, percentual: f.percentual, parcelas: f.parcelas })),
          diaFechamento: cfg.dia_fechamento,
          diaPrimeiroPagamento: cfg.dia_primeiro_pagamento,
          regrasEstorno: cfg.regras_estorno ?? '',
        }} />
      )}
      <div className="rounded-[10px] border bg-card p-4">
        <p className="font-medium">Conta</p>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
        <form action={sair} className="mt-3"><Button variant="outline" type="submit">Sair</Button></form>
      </div>
    </div>
  )
}
