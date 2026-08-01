'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { refazerOnboarding } from '@/lib/actions/dev'
import { OnboardingWizard } from '@/components/onboarding-wizard'
import { Button } from '@/components/ui/button'

type Preview = 'boas-vindas' | 'conclusao' | null

/**
 * Bastidor para percorrer fluxos que só acontecem uma vez por conta.
 *
 * Só é renderizado em desenvolvimento — a página confere o ambiente antes de
 * montar, e as actions conferem de novo do lado do servidor.
 */
export function MenuDev() {
  const [refazendo, setRefazendo] = useState(false)
  const [preview, setPreview] = useState<Preview>(null)

  async function onRefazer() {
    setRefazendo(true)
    const r = await refazerOnboarding()
    setRefazendo(false)
    if (!r.ok) { toast.error(r.erro); return }
    // recarrega de verdade: o layout é server component e só volta a mostrar
    // o wizard quando refaz a consulta de configuração
    window.location.assign('/app')
  }

  if (preview) {
    return (
      <div className="space-y-3">
        <Button variant="outline" size="sm" onClick={() => setPreview(null)}>
          Fechar pré-visualização
        </Button>
        <OnboardingWizard passoInicial={preview} preview />
      </div>
    )
  }

  return (
    <section className="space-y-3 rounded-2xl border border-dashed border-border p-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Pré-visualizar telas do onboarding</p>
        <p className="text-xs text-muted-foreground">Percorre o wizard sem gravar nada.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setPreview('boas-vindas')}>
            Boas-vindas
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPreview('conclusao')}>
            Conclusão
          </Button>
        </div>
      </div>

      <div className="space-y-2 border-t pt-3">
        <p className="text-sm font-medium">Refazer onboarding</p>
        <p className="text-xs text-muted-foreground">
          Desativa a configuração atual e devolve você ao wizard. As vendas e os meses
          já fechados continuam como estão — a configuração antiga fica guardada.
        </p>
        <Button variant="outline" size="sm" onClick={onRefazer} disabled={refazendo}>
          {refazendo ? 'Aguarde…' : 'Refazer onboarding'}
        </Button>
      </div>
    </section>
  )
}
