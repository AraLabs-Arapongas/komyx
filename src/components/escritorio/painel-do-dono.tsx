'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  ChevronLeft, ChevronRight, TrendingDown, TrendingUp, Minus,
  UserPlus, AlertTriangle, Undo2, Users, SlidersHorizontal, Target,
} from 'lucide-react'
import { usePainelDoDono, type CorretorDoPainel, type PainelDoDono } from '@/lib/queries/escritorio'
import { proximaCompetencia } from '@/lib/engine/calendario'
import { formatBRL } from '@/lib/format'
import { Valor } from '@/components/valor'
import { AvatarInicial } from '@/components/ui/avatar-inicial'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { BarraMeta } from '@/components/ui/barra-meta'
import { GraficoMeses, GraficoLinhas, GraficoComposicao } from '@/components/ui/graficos'
import { cn } from '@/lib/utils'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function mesAtual(): { ano: number; mes: number } {
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
  const [ano, mes] = hoje.split('-').map(Number)
  return { ano, mes }
}

/** Quantos dias o mês tem, e em qual deles estamos — para a projeção. */
function andamentoDoMes(ref: { ano: number; mes: number }) {
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
  const [ano, mes, dia] = hoje.split('-').map(Number)
  const diasNoMes = new Date(ref.ano, ref.mes, 0).getDate()
  // mês passado já acabou; mês futuro nem começou
  if (ref.ano < ano || (ref.ano === ano && ref.mes < mes)) return { decorridos: diasNoMes, diasNoMes }
  if (ref.ano > ano || (ref.ano === ano && ref.mes > mes)) return { decorridos: 0, diasNoMes }
  return { decorridos: dia, diasNoMes }
}

function variacao(atual: number, anterior: number): number | null {
  if (anterior <= 0) return null
  return Math.round((atual - anterior) / anterior * 100)
}

/**
 * O painel de quem coordena — página inteira, não um bloco.
 *
 * Nada aqui é a produção do dono: ele quase não vende. A tela responde três
 * perguntas, nesta ordem, porque é a ordem em que um gerente pensa: quem está
 * vendendo, o mês fecha na meta, e o que precisa da minha atenção hoje.
 */
export function PainelDoDono({ nomeEscritorio, status }: {
  nomeEscritorio: string
  status: 'ativa' | 'encerrada' | null
}) {
  const [ref, setRef] = useState(mesAtual)
  const { data, isLoading } = usePainelDoDono(ref.ano, ref.mes)

  function mudarMes(direcao: -1 | 1) {
    setRef(base => direcao === 1
      ? proximaCompetencia(base)
      : base.mes === 1 ? { ano: base.ano - 1, mes: 12 } : { ano: base.ano, mes: base.mes - 1 })
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold">{nomeEscritorio}</h1>
          <p className="text-sm text-muted-foreground">Como a equipe está vendendo</p>
        </div>
        <div className="flex items-center gap-0.5 rounded-full bg-card px-1 py-0.5 text-sm">
          <button onClick={() => mudarMes(-1)} aria-label="Mês anterior"
            className="rounded-full p-1.5 transition-colors hover:bg-muted">
            <ChevronLeft size={16} />
          </button>
          <span className="px-1.5 font-medium">{MESES[ref.mes - 1]} de {ref.ano}</span>
          <button onClick={() => mudarMes(1)} aria-label="Próximo mês"
            className="rounded-full p-1.5 transition-colors hover:bg-muted">
            <ChevronRight size={16} />
          </button>
        </div>
      </header>

      {status !== 'ativa' && (
        <div className="flex items-start gap-2.5 rounded-lg border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-3 py-2.5 text-sm">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[#B45309]" />
          <span>
            <span className="font-medium">Aguardando ativação.</span>{' '}
            <span className="text-muted-foreground">
              A gente entra em contato para fechar o plano. Até lá, cada corretor segue no plano individual.
            </span>
          </span>
        </div>
      )}

      {isLoading || !data ? <Esqueleto /> : <Conteudo dados={data} ref_={ref} />}
    </div>
  )
}

function Conteudo({ dados, ref_ }: { dados: PainelDoDono; ref_: { ano: number; mes: number } }) {
  const { decorridos, diasNoMes } = andamentoDoMes(ref_)
  const meta = dados.metaCasaCentavos ?? 0
  const pct = meta > 0 ? Math.round(dados.total.totalCentavos / meta * 100) : null
  /*
   * Projeção pelo ritmo, e só depois da primeira semana.
   *
   * Extrapolar linearmente com três dias de amostra devolve absurdo: uma
   * carta grande no dia 2 vira "1075% da meta", o dono lê uma vez, ri, e
   * nunca mais confia no número. Antes do dia 7 a tela diz só onde estamos no
   * mês, sem chutar o fim.
   */
  const DIAS_PARA_PROJETAR = 7
  const projecao = decorridos >= DIAS_PARA_PROJETAR && decorridos < diasNoMes
    ? Math.round(dados.total.totalCentavos / decorridos * diasNoMes)
    : null
  const cartaMedia = dados.total.nVendas > 0
    ? dados.total.totalCentavos / dados.total.nVendas : 0

  /*
   * Mês que ainda não começou não se compara com nada: tudo é zero, e a
   * variação sairia "-100%" com seta vermelha em todo KPI — alarme sobre um
   * mês que nem chegou.
   */
  const comparar = decorridos > 0
  const historicoMeses = dados.historico.map(h => ({ ano: h.ano, mes: h.mes, centavos: h.totalCentavos }))
  const emAlerta = dados.corretores.filter(c => c.ativo && alertaDe(c) !== null)

  return (
    <>
      {/* 1. os números do mês */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi rotulo="Vendido" centavos={dados.total.totalCentavos}
          variacao={comparar ? variacao(dados.total.totalCentavos, dados.anterior.totalCentavos) : null} />
        <Kpi rotulo="Cotas" numero={dados.total.nVendas}
          variacao={comparar ? variacao(dados.total.nVendas, dados.anterior.nVendas) : null} />
        {/* é o repasse: o que sai do escritório para a equipe */}
        <Kpi rotulo="Comissão da equipe" centavos={dados.total.comissaoCentavos}
          variacao={comparar ? variacao(dados.total.comissaoCentavos, dados.anterior.comissaoCentavos) : null} />
        <Kpi rotulo="Meta do mês" texto={pct === null ? 'sem meta' : `${pct}%`}
          apoio={meta > 0 ? formatBRL(meta) : 'defina em Metas'}
          href="/app/escritorio/metas" />
      </div>

      {/* 2. a meta, e o que falta para chegar nela */}
      {meta > 0 && (
        <BarraMeta realizadoCentavos={dados.total.totalCentavos} metaCentavos={meta}
          cartaMediaCentavos={cartaMedia} mostrarAlvo={false}
          rodape={projecao !== null
            ? <>No ritmo atual, o mês fecha em {formatBRL(projecao)}
                {` (${Math.round(projecao / meta * 100)}% da meta)`} · dia {decorridos} de {diasNoMes}</>
            : decorridos === 0
              ? 'Mês ainda não começou'
              : decorridos >= diasNoMes
                ? 'Mês encerrado'
                : `Dia ${decorridos} de ${diasNoMes} — cedo demais para projetar o fechamento`} />
      )}

      {/* 3. os corretores — o centro da tela */}
      <section className="space-y-3">
        {/* no celular os três atalhos não cabem ao lado do título, e enfiados
            à força empurravam o "Corretores" para fora da linha */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-medium">Corretores</h2>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/app/escritorio/equipe"><Users size={16} /> Equipe</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/app/escritorio/metas"><Target size={16} /> Metas</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/app/escritorio/politicas"><SlidersHorizontal size={16} /> Políticas</Link>
            </Button>
          </div>
        </div>
        <div className="divide-y overflow-hidden rounded-lg bg-card">
          {dados.corretores.map(c => (
            <LinhaCorretorPainel key={c.corretorId} c={c} comparar={comparar}
              teto={Math.max(...dados.corretores.map(x => x.totalCentavos), 1)} />
          ))}
        </div>
      </section>

      {/* 4. o que pede ação */}
      {(emAlerta.length > 0 || dados.perdas.nVendas > 0 || dados.convitesPendentes > 0) && (
        <section className="space-y-2">
          <h2 className="font-medium">Precisa de atenção</h2>
          <div className="divide-y overflow-hidden rounded-lg bg-card">
            {emAlerta.map(c => {
              const a = alertaDe(c)!
              return (
                <div key={c.corretorId} className="flex items-center gap-3 px-4 py-3">
                  <span className={cn('size-2 shrink-0 rounded-full', a.tom)} />
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="font-medium">{c.nome}</span>{' '}
                    <span className="text-muted-foreground">{a.texto}</span>
                  </span>
                </div>
              )
            })}
            {dados.perdas.nVendas > 0 && (
              <div className="flex items-center gap-3 px-4 py-3">
                <Undo2 size={16} className="shrink-0 text-[#B45309]" />
                <span className="min-w-0 flex-1 text-sm">
                  <span className="font-medium">
                    {dados.perdas.nVendas} venda{dados.perdas.nVendas === 1 ? '' : 's'} cancelada{dados.perdas.nVendas === 1 ? '' : 's'} ou estornada{dados.perdas.nVendas === 1 ? '' : 's'}
                  </span>{' '}
                  <span className="text-muted-foreground">
                    neste mês — {formatBRL(dados.perdas.totalCentavos)} em cartas
                  </span>
                </span>
              </div>
            )}
            {dados.convitesPendentes > 0 && (
              <Link href="/app/escritorio/equipe"
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-background">
                <UserPlus size={16} className="shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 text-sm">
                  <span className="font-medium">
                    {dados.convitesPendentes} convite{dados.convitesPendentes === 1 ? '' : 's'} sem resposta
                  </span>{' '}
                  <span className="text-muted-foreground">— reenvie o link</span>
                </span>
              </Link>
            )}
          </div>
        </section>
      )}

      {/* 5. os gráficos */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Bloco titulo="Produção do escritório" apoio="últimos 6 meses">
          <GraficoMeses pontos={historicoMeses} metaCentavos={dados.metaCasaCentavos} />
        </Bloco>

        {dados.historicoPorCorretor.length > 1 && (
          <Bloco titulo="Corretor a corretor" apoio="quem sobe e quem cai">
            <GraficoLinhas
              meses={dados.historico.map(h => ({ ano: h.ano, mes: h.mes }))}
              series={dados.historicoPorCorretor.map(s => ({
                nome: s.nome,
                pontos: s.serie.map(p => ({ ano: p.ano, mes: p.mes, centavos: p.totalCentavos })),
              }))} />
          </Bloco>
        )}

        <Bloco titulo="Comissão a receber" apoio="da equipe, pelos próximos meses">
          {dados.previsto.length > 0 ? (
            <GraficoMeses pontos={dados.previsto.map(p => ({ ano: p.ano, mes: p.mes, centavos: p.centavos }))} />
          ) : <Vazio>Nenhuma parcela prevista daqui para a frente.</Vazio>}
        </Bloco>

        <Bloco titulo="Onde a equipe vende" apoio={`${MESES[ref_.mes - 1]}`}>
          {dados.porAdministradora.length > 0 ? (
            <div className="space-y-5">
              <GraficoComposicao linhas={dados.porAdministradora.map(l => ({
                rotulo: l.rotulo, centavos: l.totalCentavos, nVendas: l.nVendas }))} />
              {dados.porProduto.some(p => p.rotulo) && (
                <div className="space-y-2.5 border-t pt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Por produto</p>
                  <GraficoComposicao linhas={dados.porProduto.map(l => ({
                    rotulo: l.rotulo, centavos: l.totalCentavos, nVendas: l.nVendas }))} />
                </div>
              )}
            </div>
          ) : <Vazio>Nenhuma venda neste mês.</Vazio>}
        </Bloco>
      </div>

      {/* 6. o feed — clima de equipe */}
      {dados.ultimasVendas.length > 0 && (
        <Bloco titulo="Últimas vendas da equipe">
          <div className="divide-y">
            {dados.ultimasVendas.map((v, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5">
                <AvatarInicial nome={v.nome} className="size-8 text-xs" />
                <span className="min-w-0 flex-1 text-sm">
                  <span className="font-medium">{v.nome.split(' ')[0]}</span>
                  <span className="text-muted-foreground"> · {v.cliente ?? 'sem cliente'}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{haQuanto(v.quando)}</span>
                <Valor centavos={v.centavos} className="shrink-0 text-sm" />
              </div>
            ))}
          </div>
        </Bloco>
      )}
    </>
  )
}

/**
 * O alerta de um corretor, se houver — na ordem de urgência.
 *
 * Só sinais que saem do dinheiro: sem CRM não existe "cliente sem contato",
 * mas "parou de vender" e "caiu contra o próprio histórico" são tão
 * acionáveis quanto, e não dependem de ninguém preencher nada.
 */
function alertaDe(c: CorretorDoPainel): { tom: string; texto: string } | null {
  if (c.papel === 'dono' && c.nVendas === 0) return null // o dono coordena, não vende
  if (c.diasSemVender === null) return { tom: 'bg-muted-foreground', texto: 'ainda não registrou nenhuma venda' }
  if (c.diasSemVender >= 10) return { tom: 'bg-destructive', texto: `sem vender há ${c.diasSemVender} dias` }
  if (c.mediaMensalCentavos > 0 && c.totalCentavos < c.mediaMensalCentavos * 0.5) {
    return { tom: 'bg-[#B45309]', texto: 'vendeu menos da metade da própria média' }
  }
  if (c.metaCentavos && c.totalCentavos < c.metaCentavos * 0.5) {
    return { tom: 'bg-[#B45309]', texto: 'abaixo da metade da meta' }
  }
  return null
}

function LinhaCorretorPainel({ c, teto, comparar }: {
  c: CorretorDoPainel; teto: number; comparar: boolean
}) {
  const v = comparar ? variacao(c.totalCentavos, c.anteriorCentavos) : null
  const pctMeta = c.metaCentavos ? Math.round(c.totalCentavos / c.metaCentavos * 100) : null

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <AvatarInicial nome={c.nome} />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 truncate text-sm font-medium">
            {c.nome}
            {!c.ativo && <span className="ml-1.5 text-xs font-normal text-muted-foreground">saiu da equipe</span>}
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {v !== null && <Tendencia pct={v} />}
            <Valor centavos={c.totalCentavos} className="text-sm" />
          </span>
        </div>
        {/* a barra é o que faz comparar de relance: proporcional ao maior */}
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className={cn('h-full rounded-full', pctMeta !== null && pctMeta >= 100 ? 'bg-money' : 'bg-primary')}
            style={{ width: `${Math.max(c.totalCentavos / teto * 100, c.totalCentavos > 0 ? 2 : 0)}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">
          {c.nVendas} cota{c.nVendas === 1 ? '' : 's'}
          {pctMeta !== null && ` · ${pctMeta}% da meta`}
          {' · comissão '}<Valor centavos={c.comissaoCentavos} className="inline text-xs" />
        </p>
      </div>
    </div>
  )
}

function Tendencia({ pct }: { pct: number }) {
  if (pct === 0) return <span className="flex items-center text-xs text-muted-foreground"><Minus size={13} /></span>
  const sobe = pct > 0
  return (
    <span className={cn('flex items-center gap-0.5 text-xs tabular-nums',
      sobe ? 'text-money' : 'text-destructive')}>
      {sobe ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
      {Math.abs(pct)}%
    </span>
  )
}

function Kpi({ rotulo, centavos, numero, texto, apoio, variacao: v, href }: {
  rotulo: string
  centavos?: number
  numero?: number
  texto?: string
  apoio?: string
  variacao?: number | null
  /** quando o número leva a algum lugar — "sem meta" leva a definir uma */
  href?: string
}) {
  const classe = cn('space-y-1 rounded-lg bg-card p-4',
    href && 'transition-colors hover:bg-secondary')
  const conteudo = (
    <>
      <p className="truncate text-xs text-muted-foreground">{rotulo}</p>
      <div className="flex items-baseline gap-2">
        {centavos !== undefined
          ? <Valor centavos={centavos} destaque={false} className="text-lg md:text-xl" />
          : <span className="text-lg font-semibold tabular-nums md:text-xl">{texto ?? numero}</span>}
        {v !== null && v !== undefined && <Tendencia pct={v} />}
      </div>
      {apoio && <p className="truncate text-xs text-muted-foreground">{apoio}</p>}
    </>
  )
  return href
    ? <Link href={href} className={classe}>{conteudo}</Link>
    : <div className={classe}>{conteudo}</div>
}

function Bloco({ titulo, apoio, children }: {
  titulo: string; apoio?: string; children: React.ReactNode
}) {
  return (
    <section className="space-y-3 rounded-lg bg-card p-4 md:p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-medium">{titulo}</h2>
        {apoio && <span className="shrink-0 text-xs text-muted-foreground">{apoio}</span>}
      </div>
      {children}
    </section>
  )
}

function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>
}

/** "há 8 minutos" — o feed é sobre acabou de acontecer. */
function haQuanto(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  return d === 1 ? 'ontem' : `há ${d} dias`
}

function Esqueleto() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-40 w-full" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    </div>
  )
}
