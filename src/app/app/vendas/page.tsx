'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useVendas, type VendaStatusFiltro, type VendaOrdenacao } from '@/lib/queries/vendas'
import { Valor } from '@/components/valor'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Seletor } from '@/components/seletor'
import { Plus } from 'lucide-react'

const statusLabel: Record<string, string> = {
  confirmada: 'Confirmada', cancelada: 'Cancelada', estornada: 'Estornada',
  rascunho: 'Rascunho', arquivada: 'Arquivada',
}

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const FILTROS_STATUS: { valor: VendaStatusFiltro; rotulo: string }[] = [
  { valor: 'todas', rotulo: 'Todas' },
  { valor: 'confirmada', rotulo: 'Confirmadas' },
  { valor: 'cancelada', rotulo: 'Canceladas' },
  { valor: 'estornada', rotulo: 'Estornadas' },
]

const ORDENACOES: { valor: VendaOrdenacao; rotulo: string }[] = [
  { valor: 'recentes', rotulo: 'Mais recentes' },
  { valor: 'valor', rotulo: 'Maior valor' },
  { valor: 'comissao', rotulo: 'Maior comissão' },
]

const PAGINA = 20

type ComissaoResumo = {
  valor_centavos: number
  percentual: number
  status: string
  recebimentos: { data_prevista: string; status: string }[]
} | null

function hojeSP(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}

/**
 * Mês da primeira parcela que ainda vai cair — pela mesma regra do resto do
 * produto: parcela cujo dia chegou (ou marcada à mão na época em que isso
 * existia) já caiu. Quando não resta nenhuma, a resposta é "já recebeu", não
 * um traço: traço se lê como "nada", e aqui o que houve foi o contrário.
 */
function receberaEm(comissao: ComissaoResumo, hoje: string): string {
  if (!comissao) return '—'
  const ativos = comissao.recebimentos.filter(r => r.status !== 'cancelado' && r.status !== 'estornado')
  if (ativos.length === 0) return '—'
  const pendentes = ativos.filter(r => r.status === 'previsto' && r.data_prevista > hoje)
  if (pendentes.length === 0) return 'Já recebeu'
  const menor = pendentes.reduce((m, r) => (r.data_prevista < m ? r.data_prevista : m), pendentes[0].data_prevista)
  const mes = Number(menor.slice(5, 7))
  return MESES[mes - 1] ?? '—'
}

export default function VendasPage() {
  const hoje = hojeSP()
  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState<VendaStatusFiltro>('todas')
  const [ordenacao, setOrdenacao] = useState<VendaOrdenacao>('recentes')
  const [limite, setLimite] = useState(PAGINA)

  const { data, isLoading, isFetching } = useVendas({ busca, status, ordenacao, limite })
  const vendas = data?.itens ?? []
  const total = data?.total ?? 0

  function atualizarBusca(v: string) { setBusca(v); setLimite(PAGINA) }
  function atualizarStatus(v: VendaStatusFiltro) { setStatus(v); setLimite(PAGINA) }
  function atualizarOrdenacao(v: VendaOrdenacao) { setOrdenacao(v); setLimite(PAGINA) }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Vendas</h1>
        <Button asChild><Link href="/app/vendas/nova"><Plus size={18} /> Nova venda</Link></Button>
      </div>

      <Input placeholder="Buscar por cliente, grupo, cota, administradora, contrato ou observações…"
        value={busca} onChange={e => atualizarBusca(e.target.value)} />

      {/* filtro e ordenação numa linha só: sete pílulas empilhadas empurravam
          as vendas para fora da primeira tela do celular */}
      <div className="flex items-center gap-2">
        <Seletor valor={status} opcoes={FILTROS_STATUS} onMuda={atualizarStatus} padrao="todas" />
        <Seletor valor={ordenacao} opcoes={ORDENACOES} onMuda={atualizarOrdenacao} padrao="recentes" />
        <p className="ml-auto shrink-0 text-sm text-muted-foreground">
          {isLoading ? 'Carregando…' : `${total} ${total === 1 ? 'venda' : 'vendas'}`}
        </p>
      </div>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {!isLoading && vendas.length === 0 && (
        <div className="rounded-[10px] border p-8 text-center">
          <p className="mb-3 text-muted-foreground">
            {busca || status !== 'todas'
              ? 'Nenhuma venda encontrada para esse filtro.'
              : 'Você ainda não possui vendas cadastradas.'}
          </p>
          {!busca && status === 'todas' && (
            <Button asChild><Link href="/app/vendas/nova">Cadastrar primeira venda</Link></Button>
          )}
        </div>
      )}

      <div className="space-y-2">
        {vendas.map((v, i) => {
          const comissao = v.comissoes as ComissaoResumo
          return (
            <Link key={v.id} href={`/app/vendas/${v.id}`}
              style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}
              className="entra block rounded-[10px] border bg-card p-3 transition-colors hover:bg-background">
              <div className="flex items-center justify-between">
                <p className="font-medium">{(v.clientes as { nome: string } | null)?.nome}</p>
                <Badge variant={v.status === 'confirmada' ? 'secondary' : 'outline'}>
                  {statusLabel[v.status]}</Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {v.administradora} · G{v.grupo} · C{v.cota}
                {v.numero_contrato ? ` · Contrato ${v.numero_contrato}` : ''}
              </p>
              {v.tags && v.tags.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {v.tags.map(t => (
                    <span key={t} className="rounded-full bg-secondary px-2 py-0.5 text-[0.65rem] text-secondary-foreground">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-2 space-y-1 border-t pt-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Carta</span>
                  <Valor centavos={Number(v.valor_carta_centavos)} destaque={false} className="font-medium" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Comissão prevista</span>
                  {comissao
                    ? <Valor centavos={Number(comissao.valor_centavos)} />
                    : <span className="font-medium">—</span>}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Receberá</span>
                  <span className="font-medium">{receberaEm(comissao, hoje)}</span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {!isLoading && vendas.length < total && (
        <Button variant="outline" className="w-full" disabled={isFetching}
          onClick={() => setLimite(l => l + PAGINA)}>
          {isFetching ? 'Carregando…' : 'Carregar mais'}
        </Button>
      )}
    </div>
  )
}
