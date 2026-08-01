'use client'
import { useRecebimentos, useMarcarRecebido } from '@/lib/queries/recebimentos'
import { Valor } from '@/components/valor'
import { formatData } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

function hojeSP(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}
const mesLabel = (iso: string) => {
  const [a, m] = iso.split('-')
  const nomes = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']
  return `${nomes[Number(m) - 1]} de ${a}`
}

export default function RecebimentosPage() {
  const { data: recs, isLoading } = useRecebimentos()
  const marcar = useMarcarRecebido()
  const hoje = hojeSP()
  const grupos = new Map<string, NonNullable<typeof recs>>()
  for (const r of recs ?? []) {
    const k = r.data_prevista.slice(0, 7)
    grupos.set(k, [...(grupos.get(k) ?? []), r])
  }
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Recebimentos</h1>
      {isLoading && <Skeleton className="h-24 w-full" />}
      {!isLoading && (recs ?? []).length === 0 && (
        <div className="rounded-[10px] border p-8 text-center text-muted-foreground">
          Nenhum recebimento por aqui ainda. Registre uma venda e as parcelas aparecem automaticamente.
        </div>
      )}
      {[...grupos.entries()].map(([mes, linhas]) => (
        <section key={mes} className="space-y-2">
          <h2 className="text-sm font-medium capitalize text-muted-foreground">{mesLabel(mes + '-01')}</h2>
          {linhas.map(r => {
            const atrasado = r.status === 'previsto' && r.data_prevista < hoje
            return (
              <div key={r.id} className="flex items-center justify-between rounded-[10px] border bg-card p-3">
                <div>
                  <p className="font-medium">{r.comissoes.vendas.clientes?.nome}</p>
                  <p className="text-sm text-muted-foreground">
                    Parcela {r.numero_parcela} de {r.comissoes.n_parcelas} · {formatData(r.data_prevista)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Valor centavos={Number(r.valor_centavos)} />
                  {r.status === 'recebido' && <Badge variant="secondary">Recebido</Badge>}
                  {atrasado && <Badge className="bg-[#F59E0B] text-white">Atrasado</Badge>}
                  {r.status === 'previsto' && (
                    <Button size="sm" variant="outline"
                      onClick={() => marcar.mutate({ id: r.id, data: hojeSP() })}>
                      Marcar recebido</Button>)}
                  {r.status === 'cancelado' && <Badge variant="outline">Cancelado</Badge>}
                </div>
              </div>
            )
          })}
        </section>
      ))}
    </div>
  )
}
