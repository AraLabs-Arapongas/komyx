'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useClientesLista } from '@/lib/queries/clientes'
import { Valor } from '@/components/valor'
import { AvatarInicial } from '@/components/ui/avatar-inicial'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LayoutAba, ResumoNumero } from '@/components/ui/layout-aba'
import { Plus, ChevronRight, Search, Users } from 'lucide-react'

function pluralizar(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural
}

export default function ClientesPage() {
  const [busca, setBusca] = useState('')
  const { data: clientes, isLoading } = useClientesLista(busca)
  const lista = clientes ?? []
  const total = lista.length
  /* o que a carteira inteira já rendeu: o número que justifica a tela existir */
  const comissaoTotal = lista.reduce((s, c) => s + c.comissaoCentavos, 0)
  const volumeTotal = lista.reduce((s, c) => s + c.volumeCentavos, 0)

  /*
   * O resumo some durante a busca — ali o assunto é achar alguém, e um total
   * filtrado se confundiria com o total real — e some enquanto não rendeu nada:
   * um painel anunciando R$ 0,00 ocupa a primeira dobra para dizer que ainda
   * não há notícia.
   */
  const mostrarResumo = !isLoading && !busca && comissaoTotal > 0

  return (
    <LayoutAba
      titulo="Clientes"
      acao={<Button asChild><Link href="/app/clientes/novo"><Plus size={18} /> Novo cliente</Link></Button>}
      resumo={mostrarResumo && (
        <div className="grid grid-cols-2 gap-3">
          {/* mesma leitura das outras abas: à esquerda o que a carteira
              movimentou, à direita o que sobrou para o corretor */}
          <ResumoNumero rotulo="Vendido">
            <Valor centavos={volumeTotal} destaque={false} className="block text-white" />
          </ResumoNumero>
          <ResumoNumero rotulo="Já rendeu">
            <Valor centavos={comissaoTotal} destaque={false} className="block text-money-claro" />
          </ResumoNumero>
        </div>
      )}
    >

      <div className="relative">
        <Search size={17} aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por nome…" value={busca} className="pl-10"
          autoCapitalize="none" autoCorrect="off" spellCheck={false}
          onChange={e => setBusca(e.target.value)} />
      </div>

      {!isLoading && total > 0 && (
        <p className="flex items-center justify-end gap-1.5 text-sm text-muted-foreground">
          <Users size={15} />
          {busca
            ? `${total} ${pluralizar(total, 'resultado', 'resultados')}`
            : `${total} ${pluralizar(total, 'cliente', 'clientes')}`}
        </p>
      )}

      {isLoading && (
        <div className="space-y-2">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-[4.5rem] w-full rounded-lg" />)}
        </div>
      )}

      {!isLoading && total === 0 && (
        <div className="rounded-lg border border-dashed bg-card/50 p-8 text-center">
          <p className="mb-3 text-muted-foreground">
            {busca ? 'Nenhum cliente encontrado para essa busca.' : 'Você ainda não cadastrou nenhum cliente.'}
          </p>
          {!busca && <Button asChild><Link href="/app/clientes/novo">Cadastrar primeiro cliente</Link></Button>}
        </div>
      )}

      <div className="space-y-2">
        {lista.map((c, i) => (
          <Link key={c.id} href={`/app/clientes/${c.id}`}
            /* o atraso escalonado faz a lista entrar como lista, não como bloco;
               curto o bastante para não atrasar quem já sabe em quem vai tocar */
            style={i < 8 ? { animationDelay: `${i * 35}ms` } : undefined}
            className="entra-suave group flex items-center gap-3 rounded-lg bg-card p-3 transition-colors hover:bg-secondary">
            <AvatarInicial nome={c.nome} />

            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{c.nome}</p>
              <p className="truncate text-xs text-muted-foreground">
                {[c.cidade, c.telefone].filter(Boolean).join(' · ') || 'Sem contato cadastrado'}
              </p>
            </div>

            <div className="shrink-0 text-right">
              {c.nVendas > 0 ? (
                <>
                  <Valor centavos={c.comissaoCentavos} destaque className="block text-sm font-medium" />
                  <p className="text-xs text-muted-foreground">
                    {c.nVendas} {pluralizar(c.nVendas, 'venda', 'vendas')}
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Sem vendas</p>
              )}
            </div>

            <ChevronRight size={18}
              className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </LayoutAba>
  )
}
