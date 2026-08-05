'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useDashboard } from '@/lib/queries/dashboard'
import { proximaCompetencia } from '@/lib/engine/calendario'
import { queryKeys } from '@/lib/queries/keys'
import { Valor } from '@/components/valor'
import { HeroDinheiro } from '@/components/hero-dinheiro'
import { LoteriaFederal } from '@/components/loteria-federal'
import { ComemoraSorteio } from '@/components/comemora-sorteio'
import { formatDataExtenso, rotuloCliente } from '@/lib/format'
import {
  EsqueletoHero, EsqueletoNumeros, EsqueletoLoteria, EsqueletoLista,
} from '@/components/esqueletos-painel'
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
    <Link href={href} className="block rounded-lg py-1 transition-colors hover:bg-card">
      {conteudo}
    </Link>
  )
}

/**
 * Uma das duas listas do rodapé do painel. O "ver tudo" fica no pé do cartão,
 * não ao lado do título: em meia tela o título já ocupa a linha inteira.
 */
function Lista({ titulo, verTudo, rotuloVerTudo, children }: {
  titulo: string; verTudo: string; rotuloVerTudo: string; children: React.ReactNode
}) {
  return (
    /* as duas listas dividem a linha e têm conteúdo de tamanhos diferentes:
       o cartão estica até o fim da coluna e o "ver tudo" desce junto, senão
       um termina no meio da altura do outro */
    <section className="flex min-w-0 flex-col space-y-2">
      <h2 className="text-sm font-medium text-muted-foreground">{titulo}</h2>
      <div className="flex flex-1 flex-col divide-y overflow-hidden rounded-lg bg-card">
        {children}
        <Link href={verTudo}
          className="mt-auto flex items-center justify-center gap-1 px-3 py-2 text-xs
                     font-medium text-money transition-colors hover:bg-background">
          {rotuloVerTudo} <ArrowRight size={12} />
        </Link>
      </div>
    </section>
  )
}

/** Linha das listas: empilha em meia tela, volta a ser lado a lado no desktop. */
function ItemLista({ href, titulo, apoio, centavos }: {
  href: string; titulo: string; apoio: React.ReactNode; centavos: number
}) {
  return (
    <Link href={href}
      className="block px-3 py-2.5 transition-colors hover:bg-background md:flex md:items-center md:justify-between md:gap-3 md:px-4 md:py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium md:text-base">{titulo}</p>
        <p className="truncate text-xs text-muted-foreground">{apoio}</p>
      </div>
      <Valor centavos={centavos} className="mt-0.5 block text-sm md:mt-0 md:text-base" />
    </Link>
  )
}

/**
 * O painel do corretor: quanto ele recebe, e quando.
 *
 * Saiu da rota e virou componente quando o dono ganhou painel próprio — a
 * página agora escolhe qual dos dois montar, e são telas sem nada em comum
 * além do endereço.
 */
export function PainelDoCorretor() {
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
        .select('*').eq('ativa', true).maybeSingle()
      if (error) throw error
      if (!data) throw new Error('sem config')
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

  // sem competência ainda não há o que pedir ao banco: a tela inteira é
  // esqueleto, com a forma que ela terá
  if (!comp) {
    return (
      <div className="space-y-4">
        <EsqueletoHero />
        <div className="grid grid-cols-1 gap-6 min-[360px]:grid-cols-2 min-[360px]:gap-4 md:gap-6">
          <EsqueletoNumeros />
          <EsqueletoLoteria />
        </div>
        <div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 md:gap-6">
          <EsqueletoLista />
          <EsqueletoLista />
        </div>
      </div>
    )
  }

  const foraDoAtual = !!atual && (comp.ano !== atual.ano || comp.mes !== atual.mes)
  function mudarMes(direcao: -1 | 1) {
    setRef(anterior => {
      const base = anterior ?? atual!
      if (direcao === 1) return proximaCompetencia(base)
      return base.mes === 1 ? { ano: base.ano - 1, mes: 12 } : { ano: base.ano, mes: base.mes - 1 }
    })
  }

  return (
    <div className="space-y-4">
      <ComemoraSorteio />
      <HeroDinheiro
        nome={perfil?.nome || 'corretor'}
        competencia={comp}
        pagamento={d?.pagamentoDoMes ?? null}
        hoje={hoje}
        foraDoAtual={foraDoAtual}
        onMes={mudarMes}
        onHoje={() => setRef(null)}
      />

      {isLoading || !d ? (
        /* a loteria não depende do painel: continua carregando por conta dela,
           em vez de ficar presa atrás dos números do mês */
        <>
          <div className="grid grid-cols-1 gap-6 min-[360px]:grid-cols-2 min-[360px]:gap-4 md:gap-6">
            <EsqueletoNumeros />
            <LoteriaFederal />
          </div>
          <div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 md:gap-6">
            <EsqueletoLista />
            <EsqueletoLista />
          </div>
        </>
      ) : (
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
                {/*
                  A primeira parcela de uma competência cai no mês seguinte, no
                  mínimo. Enquanto nada dela venceu, "Recebido" é zero e "Falta
                  receber" repete a comissão prevista — dois campos sem
                  informação. Aí o que interessa é quando o dinheiro começa.
                */}
                {d.comissaoRecebidaCentavos === 0 && d.primeiraParcela ? (
                  <Numero rotulo="Primeira parcela" centavos={d.primeiraParcela.valorCentavos} destaque
                    apoio={formatDataExtenso(d.primeiraParcela.data)} href="/app/recebimentos" />
                ) : (
                  <>
                    <Numero rotulo="Recebido" centavos={d.comissaoRecebidaCentavos} destaque
                      href="/app/recebimentos" />
                    <Numero rotulo="Falta receber" centavos={d.comissaoPendenteCentavos} destaque
                      href="/app/recebimentos" />
                  </>
                )}
              </div>
            </section>

            <LoteriaFederal />
          </div>

          {/* as duas listas dividem a linha, como os números e a loteria acima:
              vendas à esquerda porque é o que o corretor acabou de fazer */}
          <div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 md:gap-6">
            <Lista titulo="Últimas vendas" verTudo="/app/vendas" rotuloVerTudo="Ver todas">
              {/* mesmo tom do vazio da coluna vizinha; o caminho para criar
                  venda já é o botão do hero, logo acima */}
              {d.ultimasVendas.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Nenhuma venda neste mês
                </p>
              ) : d.ultimasVendas.map(v => (
                <ItemLista key={v.id} href={`/app/vendas/${v.id}`}
                  titulo={rotuloCliente(v.cliente)}
                  apoio={<>Carta <Valor centavos={v.valorCartaCentavos} destaque={false} className="font-normal" /></>}
                  centavos={v.comissaoPrevistaCentavos} />
              ))}
            </Lista>

            <Lista titulo="Próximos recebimentos" verTudo="/app/recebimentos" rotuloVerTudo="Ver todos">
              {d.proximos.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Nada previsto neste mês.
                </p>
              ) : d.proximos.map(p => (
                <ItemLista key={p.id} href={`/app/vendas/${p.vendaId}`}
                  titulo={rotuloCliente(p.cliente)}
                  apoio={formatDataExtenso(p.data_prevista)}
                  centavos={p.valor_centavos} />
              ))}
            </Lista>
          </div>
        </>
      )}
    </div>
  )
}
