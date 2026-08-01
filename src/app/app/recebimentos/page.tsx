'use client'
import { useState } from 'react'
import { useRecebimentos, type RecebimentoLinha } from '@/lib/queries/recebimentos'
import { Valor } from '@/components/valor'
import { formatData, formatMesAno } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

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

const FILTROS: { chave: Filtro; rotulo: string }[] = [
  { chave: 'tudo', rotulo: 'Tudo' },
  { chave: 'a_receber', rotulo: 'A receber' },
  { chave: 'recebidos', rotulo: 'Recebidos' },
]

export default function RecebimentosPage() {
  const { data: recs, isLoading } = useRecebimentos()
  const hoje = hojeSP()

  const [filtro, setFiltro] = useState<Filtro>('tudo')
  const [busca, setBusca] = useState('')
  const [ordenacao, setOrdenacao] = useState<Ordenacao>('proxima')

  const buscaNorm = busca.trim().toLowerCase()
  const filtrados = (recs ?? []).filter(r => {
    if (buscaNorm && !(r.comissoes.vendas.clientes?.nome ?? '').toLowerCase().includes(buscaNorm)) return false
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

          <div className="flex gap-2 overflow-x-auto pb-1">
            {FILTROS.map(f => (
              <button key={f.chave} type="button" onClick={() => setFiltro(f.chave)}
                className={cn('shrink-0 rounded-full px-3 py-1.5 text-sm transition-colors',
                  filtro === f.chave
                    ? 'bg-money font-medium text-white'
                    : 'border text-muted-foreground hover:text-foreground')}>
                {f.rotulo}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Input placeholder="Buscar por cliente…" value={busca}
              onChange={e => setBusca(e.target.value)} className="sm:flex-1" />
            <Select value={ordenacao} onValueChange={v => setOrdenacao(v as Ordenacao)}>
              <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="proxima">Data mais próxima</SelectItem>
                <SelectItem value="distante">Data mais distante</SelectItem>
                <SelectItem value="maior_valor">Maior valor</SelectItem>
              </SelectContent>
            </Select>
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
                  <div key={r.id} className="rounded-[10px] border bg-card p-3 md:flex md:items-center md:justify-between md:gap-4">
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
                  </div>
                )
              })}
            </section>
          ))}
        </>
      )}
    </div>
  )
}
