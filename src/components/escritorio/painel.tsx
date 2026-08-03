'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Clock, Users } from 'lucide-react'
import { usePainelEscritorio } from '@/lib/queries/escritorio'
import { proximaCompetencia } from '@/lib/engine/calendario'
import { Valor } from '@/components/valor'
import { AvatarInicial } from '@/components/ui/avatar-inicial'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CurvaMarca } from '@/components/curva-marca'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function mesAtual(): { ano: number; mes: number } {
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
  const [ano, mes] = hoje.split('-').map(Number)
  return { ano, mes }
}

/**
 * A produção do escritório, mês a mês, na visão do dono.
 *
 * Tudo que aparece aqui chegou agregado do banco — o RPC soma; esta tela só
 * dá forma. É a mesma silhueta das abas de lista: cartão de aurora com o
 * total em cima, listas em cartões embaixo.
 */
export function PainelEscritorio({ status }: { status: 'ativa' | 'encerrada' | null }) {
  const [ref, setRef] = useState(mesAtual)
  const { data, isLoading } = usePainelEscritorio(ref.ano, ref.mes)

  function mudarMes(direcao: -1 | 1) {
    setRef(base => direcao === 1
      ? proximaCompetencia(base)
      : base.mes === 1 ? { ano: base.ano - 1, mes: 12 } : { ano: base.ano, mes: base.mes - 1 })
  }

  return (
    <div className="space-y-4">
      {status !== 'ativa' && (
        /* criou mas o comercial ainda não fechou: dizer é melhor que deixar o
           dono descobrir pela equipe reclamando do próprio teste vencendo */
        <div className="entra-suave flex items-start gap-2.5 rounded-lg border border-[#F59E0B]/40
                        bg-[#F59E0B]/10 px-3 py-2.5 text-sm">
          <Clock size={18} className="mt-0.5 shrink-0 text-[#B45309]" />
          <span>
            <span className="font-medium">Aguardando ativação.</span>{' '}
            <span className="text-muted-foreground">
              A gente entra em contato para fechar o plano. Até lá, cada corretor
              segue no plano individual.
            </span>
          </span>
        </div>
      )}

      {/* o total do mês na superfície da marca, com o seletor no mesmo lugar
          em que ele vive no painel de Início */}
      <section className="entra-suave superficie-marca-faixa relative overflow-hidden rounded-lg p-4 text-white">
        <div aria-hidden className="brilho-marca pointer-events-none absolute inset-0" />
        <CurvaMarca />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-white/75">Produção do escritório</p>
            <div className="flex items-center gap-0.5 rounded-full bg-white/10 px-1 py-0.5 text-xs">
              <button onClick={() => mudarMes(-1)} aria-label="Mês anterior"
                className="rounded-full p-1 hover:bg-white/10">
                <ChevronLeft size={16} />
              </button>
              <span className="px-1 font-medium">{MESES[ref.mes - 1]}</span>
              <button onClick={() => mudarMes(1)} aria-label="Próximo mês"
                className="rounded-full p-1 hover:bg-white/10">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-3">
            {/* Valor, e não formatBRL: o modo privacidade vale aqui também —
                este é justamente o número que se esconde numa reunião */}
            {data
              ? <Valor centavos={data.total.totalCentavos} destaque={false}
                  className="text-lg text-white md:text-2xl" />
              : <p className="text-lg font-semibold md:text-2xl">—</p>}
            <p className="shrink-0 text-xs text-white/75">
              {data ? `${data.total.nVendas} venda${data.total.nVendas === 1 ? '' : 's'}` : ''}
            </p>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Por corretor</h2>
        <Button asChild variant="outline" size="sm">
          <Link href="/app/escritorio/equipe"><Users size={16} /> Equipe</Link>
        </Button>
      </div>

      {isLoading || !data ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {data.porCorretor.map((c, i) => (
              <div key={c.corretorId} style={{ animationDelay: `${i * 60}ms` }}
                className="entra flex items-center gap-3 rounded-lg bg-card p-4">
                <AvatarInicial nome={c.nome} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {c.nome}
                    {!c.ativo && <span className="ml-1.5 text-xs font-normal text-muted-foreground">saiu da equipe</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {c.nVendas} venda{c.nVendas === 1 ? '' : 's'} · comissão <Valor centavos={c.comissaoCentavos} className="inline" />
                  </p>
                </div>
                <Valor centavos={c.totalCentavos} className="shrink-0 text-sm font-semibold" />
              </div>
            ))}
          </div>

          {data.porAdministradora.length > 0 && (
            <BlocoAgrupado titulo="Por administradora"
              linhas={data.porAdministradora.map(l => ({
                rotulo: l.administradora ?? '', nVendas: l.nVendas, totalCentavos: l.totalCentavos,
              }))} />
          )}
          {/* só aparece quando alguma venda tem produto preenchido: uma lista
              inteira de "Sem produto" não informa nada */}
          {data.porProduto.some(l => l.produto) && (
            <BlocoAgrupado titulo="Por produto"
              linhas={data.porProduto.map(l => ({
                rotulo: l.produto || 'Sem produto', nVendas: l.nVendas, totalCentavos: l.totalCentavos,
              }))} />
          )}
        </>
      )}
    </div>
  )
}

function BlocoAgrupado({ titulo, linhas }: {
  titulo: string
  linhas: { rotulo: string; nVendas: number; totalCentavos: number }[]
}) {
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-muted-foreground">{titulo}</h2>
      <div className="divide-y overflow-hidden rounded-lg bg-card">
        {linhas.map(l => (
          <div key={l.rotulo} className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{l.rotulo}</span>
              <span className="block text-xs text-muted-foreground">
                {l.nVendas} venda{l.nVendas === 1 ? '' : 's'}
              </span>
            </span>
            <Valor centavos={l.totalCentavos} className="shrink-0 text-sm font-semibold" />
          </div>
        ))}
      </div>
    </div>
  )
}
