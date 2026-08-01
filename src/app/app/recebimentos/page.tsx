'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRecebimentos, type RecebimentoLinha } from '@/lib/queries/recebimentos'
import { Valor } from '@/components/valor'
import { formatData, formatMesAno } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Seletor, type Opcao } from '@/components/seletor'

function hojeSP(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}

/**
 * O escritório paga no dia combinado, então a parcela conta como recebida
 * assim que a data chega — sem o corretor precisar confirmar nada.
 */
function jaCaiu(r: RecebimentoLinha, hoje: string): boolean {
  if (r.status === 'cancelado' || r.status === 'estornado') return false
  return r.status === 'recebido' || r.data_prevista <= hoje
}

type Filtro = 'tudo' | 'a_receber' | 'recebidos'
type Ordenacao = 'proxima' | 'distante' | 'maior_valor'

const FILTROS: Opcao<Filtro>[] = [
  { valor: 'tudo', rotulo: 'Tudo' },
  { valor: 'a_receber', rotulo: 'A receber' },
  { valor: 'recebidos', rotulo: 'Recebidos' },
]

const ORDENACOES: Opcao<Ordenacao>[] = [
  { valor: 'proxima', rotulo: 'Data mais próxima', rotuloCurto: 'Mais próxima' },
  { valor: 'distante', rotulo: 'Data mais distante', rotuloCurto: 'Mais distante' },
  { valor: 'maior_valor', rotulo: 'Maior valor' },
]

const MES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const TODOS_OS_MESES = 'todos'

/** Só os meses que têm parcela: oferecer um calendário inteiro seria escolher no vazio. */
function mesesDisponiveis(recs: RecebimentoLinha[]): Opcao<string>[] {
  const chaves = [...new Set(recs.map(r => r.data_prevista.slice(0, 7)))].sort()
  return [
    { valor: TODOS_OS_MESES, rotulo: 'Todos os meses', rotuloCurto: 'Mês' },
    ...chaves.map(k => {
      const ano = Number(k.slice(0, 4)), mes = Number(k.slice(5, 7))
      return {
        valor: k,
        rotulo: formatMesAno(ano, mes),
        rotuloCurto: `${MES_ABREV[mes - 1]}/${ano}`,
      }
    }),
  ]
}

export default function RecebimentosPage() {
  const { data: recs, isLoading } = useRecebimentos()
  const hoje = hojeSP()

  const [filtro, setFiltro] = useState<Filtro>('tudo')
  const [busca, setBusca] = useState('')
  const [ordenacao, setOrdenacao] = useState<Ordenacao>('proxima')
  const [mes, setMes] = useState<string>(TODOS_OS_MESES)

  const MESES_OPCOES = mesesDisponiveis(recs ?? [])
  // um mês que sumiu da lista (a busca estreitou o conjunto) deixaria a tela
  // vazia sem explicação: nesse caso o filtro de mês não se aplica
  const mesValido = MESES_OPCOES.some(o => o.valor === mes) ? mes : TODOS_OS_MESES

  const buscaNorm = busca.trim().toLowerCase()
  const filtrados = (recs ?? []).filter(r => {
    if (buscaNorm && !(r.comissoes.vendas.clientes?.nome ?? '').toLowerCase().includes(buscaNorm)) return false
    if (mesValido !== TODOS_OS_MESES && r.data_prevista.slice(0, 7) !== mesValido) return false
    const caiu = jaCaiu(r, hoje)
    if (filtro === 'a_receber') return !caiu && r.status === 'previsto'
    if (filtro === 'recebidos') return caiu
    return true
  })

  // resumo reflete o que está na tela agora: busca e pílula já aplicadas
  let totalAReceberCentavos = 0, totalRecebidoCentavos = 0
  for (const r of filtrados) {
    const valor = Number(r.valor_centavos)
    if (jaCaiu(r, hoje)) totalRecebidoCentavos += valor
    else if (r.status === 'previsto') totalAReceberCentavos += valor
  }

  const ordenados = [...filtrados].sort((a, b) => {
    if (ordenacao === 'maior_valor') return Number(b.valor_centavos) - Number(a.valor_centavos)
    if (ordenacao === 'distante') return b.data_prevista.localeCompare(a.data_prevista)
    return a.data_prevista.localeCompare(b.data_prevista)
  })

  const grupos = new Map<string, typeof ordenados>()
  for (const r of ordenados) {
    const k = r.data_prevista.slice(0, 7)
    grupos.set(k, [...(grupos.get(k) ?? []), r])
  }

  const semNenhumRecebimento = !isLoading && (recs ?? []).length === 0
  const semResultadoNoFiltro = !isLoading && !semNenhumRecebimento && filtrados.length === 0

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Agenda financeira</h1>

      {isLoading && <Skeleton className="h-24 w-full" />}

      {semNenhumRecebimento && (
        <div className="rounded-[10px] border p-8 text-center text-muted-foreground">
          Nenhum recebimento por aqui ainda. Registre uma venda e as parcelas aparecem automaticamente.
        </div>
      )}

      {!isLoading && !semNenhumRecebimento && (
        <>
          {/* Resumo — superfície escura pra separar do restante da tela e dar peso ao dinheiro */}
          <section className="entra rounded-[10px] bg-escuro p-5 text-white">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-escuro-texto">A receber</p>
                <Valor centavos={totalAReceberCentavos} destaque={false}
                  className="mt-1 block text-lg text-white md:text-2xl" />
              </div>
              <div>
                <p className="text-xs text-escuro-texto">Recebido</p>
                <Valor centavos={totalRecebidoCentavos} destaque={false}
                  className="mt-1 block text-lg text-money-claro md:text-2xl" />
              </div>
            </div>
          </section>

          <Input placeholder="Buscar por cliente…" value={busca}
            onChange={e => setBusca(e.target.value)} />

          <div className="flex flex-wrap items-center gap-2">
            <Seletor valor={mesValido} opcoes={MESES_OPCOES} onMuda={setMes} padrao={TODOS_OS_MESES} />
            <Seletor valor={filtro} opcoes={FILTROS} onMuda={setFiltro} padrao="tudo" />
            <Seletor valor={ordenacao} opcoes={ORDENACOES} onMuda={setOrdenacao} padrao="proxima" />
          </div>

          {semResultadoNoFiltro && (
            <div className="rounded-[10px] border p-8 text-center text-muted-foreground">
              Nenhum recebimento encontrado com esses filtros.
            </div>
          )}

          {[...grupos.entries()].map(([mes, linhas]) => (
            <section key={mes} className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">
                {formatMesAno(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)))}
              </h2>
              {linhas.map(r => {
                const caiu = jaCaiu(r, hoje)
                const anulada = r.status === 'cancelado' || r.status === 'estornado'
                return (
                  <Link key={r.id} href={`/app/vendas/${r.comissoes.vendas.id}`}
                    className="block rounded-[10px] border bg-card p-3 transition-colors hover:border-money/40 md:flex md:items-center md:justify-between md:gap-4">
                    <div className="min-w-0">
                      <p className="font-medium">{r.comissoes.vendas.clientes?.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        Parcela {r.numero_parcela} de {r.comissoes.n_parcelas} · {formatData(r.data_prevista)}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 md:mt-0 md:justify-end">
                      {/* parcela anulada não é dinheiro do corretor: perde o verde */}
                      <Valor centavos={Number(r.valor_centavos)} destaque={!anulada && caiu} />
                      {r.status === 'cancelado' && <Badge variant="outline">Cancelado</Badge>}
                      {r.status === 'estornado' && <Badge variant="outline">Estornado</Badge>}
                      {r.comissoes.vendas.status === 'cancelada' && <Badge variant="outline">Venda cancelada</Badge>}
                      {r.comissoes.vendas.status === 'estornada' && <Badge variant="outline">Desistência</Badge>}
                      {!anulada && (
                        <Badge variant={caiu ? 'secondary' : 'outline'}>
                          {caiu ? 'Recebido' : 'A receber'}
                        </Badge>
                      )}
                    </div>
                  </Link>
                )
              })}
            </section>
          ))}
        </>
      )}
    </div>
  )
}
