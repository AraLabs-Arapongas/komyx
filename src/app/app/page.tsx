'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useDashboard } from '@/lib/queries/dashboard'
import { competenciaDaVenda, proximaCompetencia } from '@/lib/engine/calendario'
import { queryKeys } from '@/lib/queries/keys'
import { Valor } from '@/components/valor'
import { HeroDinheiro } from '@/components/hero-dinheiro'
import { LoteriaFederal } from '@/components/loteria-federal'
import { formatData, formatDataExtenso } from '@/lib/format'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowRight } from 'lucide-react'

function hojeSP(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}

function pluralizar(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural
}

/**
 * Mês que o painel abre. Antes do dia do pagamento, o corretor ainda espera o
 * dinheiro deste mês; depois dele, o que importa já é o mês seguinte.
 */
function mesDoProximoPagamento(hoje: string, diaPagamento: number): { ano: number; mes: number } {
  const [ano, mes, dia] = hoje.split('-').map(Number)
  if (dia <= diaPagamento) return { ano, mes }
  return mes === 12 ? { ano: ano + 1, mes: 1 } : { ano, mes: mes + 1 }
}

/** Número do resumo: rótulo pequeno em cima, valor forte embaixo, sem moldura. */
function Numero({ rotulo, centavos, destaque = false, apoio, href }: {
  rotulo: string; centavos: number; destaque?: boolean; apoio?: string; href?: string
}) {
  const conteudo = (
    <>
      <p className="text-xs text-muted-foreground md:text-sm">{rotulo}</p>
      <Valor centavos={centavos} destaque={destaque} className="block text-base md:mt-0.5 md:text-xl" />
      {apoio && <p className="text-xs text-muted-foreground">{apoio}</p>}
    </>
  )
  if (!href) return <div className="py-1">{conteudo}</div>
  return (
    <Link href={href} className="block rounded-xl py-1 transition-colors hover:bg-card">
      {conteudo}
    </Link>
  )
}

export default function DashboardPage() {
  const { data: perfil } = useQuery({
    queryKey: ['perfil'],
    queryFn: async () => {
      const { data } = await createClient().from('profiles').select('nome').single()
      return data
    },
  })
  const { data: config } = useQuery({
    queryKey: queryKeys.config,
    queryFn: async () => {
      const { data, error } = await createClient().from('config_financeira')
        .select('*').eq('ativa', true).single()
      if (error) throw error
      return data
    },
  })
  const hoje = hojeSP()
  // o mês que abre é o do próximo pagamento, não o de hoje: enquanto o dia do
  // pagamento não chega, o corretor ainda está esperando o dinheiro deste mês;
  // passado o dia, o que interessa já é o mês que vem
  const atual = config ? mesDoProximoPagamento(hoje, config.dia_primeiro_pagamento) : null
  const [ref, setRef] = useState<{ ano: number; mes: number } | null>(null)
  const comp = ref ?? atual
  const { data: d, isLoading } = useDashboard(comp?.ano ?? 0, comp?.mes ?? 0)

  if (!comp) return <Skeleton className="h-64 w-full rounded-3xl" />

  const foraDoAtual = !!atual && (comp.ano !== atual.ano || comp.mes !== atual.mes)
  function mudarMes(direcao: -1 | 1) {
    setRef(anterior => {
      const base = anterior ?? atual!
      if (direcao === 1) return proximaCompetencia(base)
      return base.mes === 1 ? { ano: base.ano - 1, mes: 12 } : { ano: base.ano, mes: base.mes - 1 }
    })
  }

  return (
    <div className="space-y-8">
      <HeroDinheiro
        nome={perfil?.nome || 'corretor'}
        competencia={comp}
        pagamento={d?.pagamentoDoMes ?? null}
        hoje={hoje}
        foraDoAtual={foraDoAtual}
        onMes={mudarMes}
        onHoje={() => setRef(null)}
      />

      {isLoading || !d ? <Skeleton className="h-40 w-full rounded-2xl" /> : (
        <>
          {/* O hero respondeu "quanto vou receber". Aqui vêm as duas leituras de
              apoio, lado a lado: os números do mês e o sorteio que contempla. */}
          {/* abaixo de 360px "R$ 1.000.000,00" não cabe em meia tela e invade a
              coluna vizinha: ali os dois blocos voltam a empilhar */}
          <div className="grid grid-cols-1 gap-6 min-[360px]:grid-cols-2 min-[360px]:gap-4 md:gap-6">
            <section className="entra-suave min-w-0 space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto',
                  'Setembro','Outubro','Novembro','Dezembro'][comp.mes - 1]} em números
              </h2>
              {/* meia tela não comporta duas colunas de dinheiro no celular */}
              <div className="grid gap-y-2.5 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-5">
                <Numero rotulo="Vendido" centavos={d.totalVendidoCentavos}
                  apoio={`${d.nVendas} ${pluralizar(d.nVendas, 'venda', 'vendas')}`}
                  href="/app/vendas" />
                <Numero rotulo="Comissão prevista" centavos={d.comissaoPrevistaCentavos} destaque />
                <Numero rotulo="Recebido" centavos={d.comissaoRecebidaCentavos} destaque
                  href="/app/recebimentos" />
                <Numero rotulo="Falta receber" centavos={d.comissaoPendenteCentavos} destaque
                  href="/app/recebimentos" />
              </div>
            </section>

            <LoteriaFederal />
          </div>

          {/* o ticket médio é a leitura mais periférica das duas colunas: sai
              delas para as alturas fecharem e vira rodapé do bloco */}
          <p className="-mt-4 text-xs text-muted-foreground">
            Ticket médio de <Valor centavos={d.ticketMedioCentavos} destaque={false} className="font-normal" />
          </p>


          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground">Próximos recebimentos</h2>
              <Link href="/app/recebimentos"
                className="flex items-center gap-1 text-sm text-money hover:underline">
                Ver agenda <ArrowRight size={14} />
              </Link>
            </div>
            {d.proximos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nada previsto ainda. Registre uma venda para o calendário começar a encher.
              </p>
            ) : (
              <div className="divide-y overflow-hidden rounded-2xl bg-card">
                {d.proximos.map(p => (
                  <Link key={p.id} href={`/app/vendas/${p.vendaId}`}
                    className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-background">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.cliente}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDataExtenso(p.data_prevista)} · {formatData(p.data_prevista)}
                      </p>
                    </div>
                    <Valor centavos={p.valor_centavos} />
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground">Últimas vendas</h2>
              <Link href="/app/vendas"
                className="flex items-center gap-1 text-sm text-money hover:underline">
                Ver todas <ArrowRight size={14} />
              </Link>
            </div>
            {d.ultimasVendas.length === 0 ? (
              <div className="rounded-2xl bg-card px-4 py-8 text-center">
                <p className="font-medium">Nenhuma venda neste mês ainda</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Cadastre uma venda e eu calculo a comissão para você.
                </p>
                <Link href="/app/vendas/nova"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-money hover:underline">
                  Registrar venda <ArrowRight size={14} />
                </Link>
              </div>
            ) : (
              <div className="divide-y overflow-hidden rounded-2xl bg-card">
                {d.ultimasVendas.map(v => (
                  <Link key={v.id} href={`/app/vendas/${v.id}`}
                    className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-background">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{v.cliente || 'Cliente sem nome'}</p>
                      <p className="text-xs text-muted-foreground">
                        Carta <Valor centavos={v.valorCartaCentavos} destaque={false} className="font-normal" />
                      </p>
                    </div>
                    <Valor centavos={v.comissaoPrevistaCentavos} />
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
