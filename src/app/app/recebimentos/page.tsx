'use client'
import { useRecebimentos, useMarcarRecebido } from '@/lib/queries/recebimentos'
import { Valor } from '@/components/valor'
import { formatData, formatMesAno } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

function hojeSP(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
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
          <h2 className="text-sm font-medium text-muted-foreground">
            {formatMesAno(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)))}
          </h2>
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
                  {atrasado && <Badge className="bg-[#F59E0B] text-white">Atrasado</Badge>}
                  {r.status === 'cancelado' && <Badge variant="outline">Cancelado</Badge>}
                  {r.comissoes.vendas.status === 'cancelada' && <Badge variant="outline">Venda cancelada</Badge>}
                  {(r.status === 'previsto' || r.status === 'recebido') && (
                    <Label
                      htmlFor={`recebido-${r.id}`}
                      className="flex items-center gap-2 rounded-[10px] px-2 py-2 -mr-2 font-normal cursor-pointer has-disabled:cursor-default"
                    >
                      <Checkbox
                        id={`recebido-${r.id}`}
                        checked={r.status === 'recebido'}
                        disabled={r.status === 'recebido'}
                        onCheckedChange={checked => {
                          if (checked) marcar.mutate({ id: r.id, data: hojeSP() })
                        }}
                      />
                      Recebido
                    </Label>
                  )}
                </div>
              </div>
            )
          })}
        </section>
      ))}
    </div>
  )
}
