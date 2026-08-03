import Link from 'next/link'
import { Building2, SlidersHorizontal } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { configEfetiva } from '@/lib/actions/recalcular'
import { ConfigForm } from '@/components/config-form'
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina'
import { RegrasVigentes } from '@/components/escritorio/regras-vigentes'
import type { Faixa, PoliticaEstorno } from '@/lib/domain/types'

export default async function ConfiguracaoPage() {
  const supabase = await createClient()
  // a PESSOAL, para editar — e a efetiva, que é quem manda quando existe
  // escritório
  const [{ data: cfg }, efetiva, { data: vinculo }] = await Promise.all([
    supabase.from('config_financeira')
      .select('*').eq('ativa', true).is('escritorio_id', null).maybeSingle(),
    configEfetiva(supabase),
    supabase.rpc('meu_escritorio'),
  ])
  const politicaDoEscritorio = efetiva?.escritorio_id != null
  const ehDono = (vinculo as { papel?: string } | null)?.papel === 'dono'

  /*
   * Sob política de escritório a tela troca de natureza: deixa de ser um
   * formulário e vira uma ficha.
   *
   * Antes ela mostrava os quatro passos editáveis com um aviso em cima
   * dizendo que nada ali estava valendo — quatro telas de trabalho que não
   * mudam número nenhum. Quem não decide a regra não precisa do formulário
   * dela; precisa de saber qual é a regra e o que se espera dele no mês.
   */
  if (politicaDoEscritorio && efetiva) {
    return (
      <div className="coluna-formulario space-y-6 md:min-h-0">
        <CabecalhoPagina voltarPara="/app/perfil" titulo="Suas regras"
          apoio="Como o seu escritório calcula e paga a sua comissão." />
        {/* o dono lê a mesma ficha, mas com o caminho de volta para editá-la:
            a política dele vale para as vendas dele também, e dizer-lhe que
            "o escritório define" seria falar dele na terceira pessoa */}
        <div className="flex items-start gap-2.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm">
          <Building2 size={18} className="mt-0.5 shrink-0 text-primary" />
          <span className="space-y-2 text-muted-foreground">
            <span className="block">
              {ehDono ? (
                <>
                  <span className="font-medium text-foreground">Estas são as regras do escritório.</span>{' '}
                  Valem para toda a equipe, inclusive para as suas próprias vendas.
                </>
              ) : (
                <>
                  <span className="font-medium text-foreground">Quem define estas regras é o escritório.</span>{' '}
                  Mudanças feitas por lá valem para as suas próximas vendas.
                </>
              )}
            </span>
            {ehDono && (
              <Button asChild variant="outline" size="sm">
                <Link href="/app/escritorio/politicas">
                  <SlidersHorizontal size={16} /> Editar políticas
                </Link>
              </Button>
            )}
          </span>
        </div>
        <RegrasVigentes
          faixas={efetiva.faixas as Faixa[]}
          diaFechamento={efetiva.dia_fechamento}
          diaPrimeiroPagamento={efetiva.dia_primeiro_pagamento}
          politicaEstorno={(efetiva.politica_estorno ?? 'perguntar') as PoliticaEstorno}
          faixaPorEscritorio={efetiva.faixa_por_escritorio} />
      </div>
    )
  }

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
