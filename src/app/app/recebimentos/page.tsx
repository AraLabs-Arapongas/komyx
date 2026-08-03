'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRecebimentos, useResumoAgenda, type RecebimentoLinha } from '@/lib/queries/recebimentos'
import { Valor } from '@/components/valor'
import { formatData, formatMesAno, rotuloCliente } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Seletor, type Opcao } from '@/components/seletor'
import { LayoutAba, ResumoNumero } from '@/components/ui/layout-aba'

const PAGINA = 50

function hojeSP(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}

/**
 * O escritório paga no dia combinado, então a parcela conta como recebida
 * assim que a data chega — sem o corretor precisar confirmar nada.
 * Mesma regra da função `resumo_agenda` no banco.
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
function opcoesDeMes(meses: string[]): Opcao<string>[] {
  return [
    { valor: TODOS_OS_MESES, rotulo: 'Todos os meses', rotuloCurto: 'Mês' },
    ...meses.map(k => {
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
  const hoje = hojeSP()

  const [filtro, setFiltro] = useState<Filtro>('tudo')
  const [busca, setBusca] = useState('')
  const [ordenacao, setOrdenacao] = useState<Ordenacao>('proxima')
  const [mes, setMes] = useState<string>(TODOS_OS_MESES)
  const [limite, setLimite] = useState(PAGINA)

  const buscaNorm = busca.trim()
  const { data: resumo, isLoading: carregandoResumo } = useResumoAgenda(hoje, buscaNorm)
  const MESES_OPCOES = opcoesDeMes(resumo?.meses ?? [])
  // um mês que sumiu da lista (a busca estreitou o conjunto) deixaria a tela
  // vazia sem explicação: nesse caso o filtro de mês não se aplica
  const mesValido = MESES_OPCOES.some(o => o.valor === mes) ? mes : TODOS_OS_MESES

  const { data: recs, isLoading, isFetching } = useRecebimentos({
    mes: mesValido === TODOS_OS_MESES ? '' : mesValido,
    busca: buscaNorm,
    limite,
  })

  function trocarFiltro<T>(set: (v: T) => void) {
    return (v: T) => { set(v); setLimite(PAGINA) }
  }

  // status e ordenação continuam no cliente: incidem sobre a página já carregada
  const linhas = (recs ?? []).filter(r => {
    const caiu = jaCaiu(r, hoje)
    if (filtro === 'a_receber') return !caiu && r.status === 'previsto'
    if (filtro === 'recebidos') return caiu
    return true
  })

  const ordenados = [...linhas].sort((a, b) => {
    if (ordenacao === 'maior_valor') return Number(b.valor_centavos) - Number(a.valor_centavos)
    if (ordenacao === 'distante') return b.data_prevista.localeCompare(a.data_prevista)
    return a.data_prevista.localeCompare(b.data_prevista)
  })

  const carregando = isLoading || carregandoResumo
  const semNenhumRecebimento = !carregando && !buscaNorm && (resumo?.total ?? 0) === 0
  const semResultadoNoFiltro = !carregando && !semNenhumRecebimento && ordenados.length === 0
  const temMais = !carregando && (recs?.length ?? 0) >= limite

  const temResumo = !carregando && !semNenhumRecebimento

  return (
    <LayoutAba
      titulo="Recebimentos"
      resumo={temResumo && (
        <div className="grid grid-cols-2 gap-3">
          {/* o que ainda vem é expectativa, fica branco; o que já caiu é
              dinheiro na conta, e só ele leva o verde */}
          <ResumoNumero rotulo="A receber">
            <Valor centavos={resumo?.aReceberCentavos ?? 0} destaque={false} className="block text-white" />
          </ResumoNumero>
          <ResumoNumero rotulo="Recebido">
            <Valor centavos={resumo?.recebidoCentavos ?? 0} destaque={false} className="block text-money-claro" />
          </ResumoNumero>
        </div>
      )}
    >

      {carregando && <Skeleton className="h-24 w-full" />}

      {semNenhumRecebimento && (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          Nenhum recebimento por aqui ainda. Registre uma venda e as parcelas aparecem automaticamente.
        </div>
      )}

      {!carregando && !semNenhumRecebimento && (
        <>
          <Input placeholder="Buscar por cliente…" value={busca}
            onChange={e => { setBusca(e.target.value); setLimite(PAGINA) }} />

          <div className="flex flex-wrap items-center gap-2">
            <Seletor valor={mesValido} opcoes={MESES_OPCOES} onMuda={trocarFiltro(setMes)}
              padrao={TODOS_OS_MESES} />
            <Seletor valor={filtro} opcoes={FILTROS} onMuda={setFiltro} padrao="tudo" />
            <Seletor valor={ordenacao} opcoes={ORDENACOES} onMuda={setOrdenacao} padrao="proxima" />
          </div>

          {semResultadoNoFiltro && (
            <div className="rounded-lg border p-8 text-center text-muted-foreground">
              Nenhum recebimento encontrado com esses filtros.
            </div>
          )}

          {/* Sem cabeçalho de mês: a data está em cada linha e o filtro de mês
              fica logo acima. O separador repetia por escrito o que os dois já
              diziam, e numa lista de três parcelas gerava três títulos. */}
          <div className="space-y-2">
            {ordenados.map(r => {
                const caiu = jaCaiu(r, hoje)
                const anulada = r.status === 'cancelado' || r.status === 'estornado'
                return (
                  <Link key={r.id} href={`/app/vendas/${r.comissoes.vendas.id}`}
                    className="block rounded-lg bg-card p-3 transition-colors hover:bg-secondary md:flex md:items-center md:justify-between md:gap-4">
                    <div className="min-w-0">
                      <p className="font-medium">{rotuloCliente(r.comissoes.vendas.clientes?.nome)}</p>
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
          </div>

          {temMais && (
            <Button variant="outline" className="w-full" disabled={isFetching}
              onClick={() => setLimite(l => l + PAGINA)}>
              {isFetching ? 'Carregando…' : 'Carregar mais'}
            </Button>
          )}
        </>
      )}
    </LayoutAba>
  )
}
