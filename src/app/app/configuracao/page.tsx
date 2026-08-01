import { createClient } from '@/lib/supabase/server'
import { ConfigForm } from '@/components/config-form'
import { PerfilForm, BackupSecao } from '@/components/perfil-form'
import type { Faixa, PoliticaEstorno } from '@/lib/domain/types'

export default async function ConfiguracaoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const [{ data: cfg }, { data: perfil }] = await Promise.all([
    supabase.from('config_financeira').select('*').eq('ativa', true).single(),
    supabase.from('profiles').select('nome, telefone').eq('id', user?.id ?? '').single(),
  ])
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
          politicaEstorno: (cfg.politica_estorno ?? 'perguntar') as PoliticaEstorno,
        }} />
      )}

      {/* as seções vivem dentro dos componentes cliente: um ícone do Lucide é
          uma função, e função não atravessa a fronteira servidor → cliente */}
      <PerfilForm
        email={user?.email ?? ''}
        nome={perfil?.nome ?? ''}
        telefone={perfil?.telefone ?? ''}
      />
      <BackupSecao />
    </div>
  )
}
