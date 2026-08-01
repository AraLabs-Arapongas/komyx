import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OnboardingWizard } from '@/components/onboarding-wizard'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: config } = await supabase.from('config_financeira')
    .select('id').eq('ativa', true).maybeSingle()
  if (config) redirect('/app')
  return <OnboardingWizard />
}
