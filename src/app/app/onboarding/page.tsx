import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ConfigForm } from '@/components/config-form'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: config } = await supabase.from('config_financeira')
    .select('id').eq('ativa', true).maybeSingle()
  if (config) redirect('/app')
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Bem-vindo ao ConsorPro</h1>
        <p className="text-muted-foreground">
          Antes de registrar sua primeira venda, configure como seu escritório paga comissão.
          Você só faz isso uma vez.
        </p>
      </div>
      <ConfigForm modo="onboarding" />
    </div>
  )
}
