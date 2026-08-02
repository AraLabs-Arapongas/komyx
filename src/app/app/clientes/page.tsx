'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useClientesLista } from '@/lib/queries/clientes'
import { Valor } from '@/components/valor'
import { AvatarInicial } from '@/components/ui/avatar-inicial'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Clientes</h1>
        <Button asChild><Link href="/app/clientes/novo"><Plus size={18} /> Novo cliente</Link></Button>
      </div>

      {/*
        Resumo da carteira antes da lista: quem abre esta tela quer saber quanto
        ela vale, não contar linhas. Some quando a busca está ativa — ali o
        assunto é achar alguém, e um total filtrado confundiria com o total real.

        Some também enquanto não rendeu nada: um painel anunciando R$ 0,00 não
        informa, só ocupa a primeira dobra para dizer que ainda não há notícia.
      */}
      {!isLoading && !busca && comissaoTotal > 0 && (
        <section className="entra-suave superficie-marca-faixa relative overflow-hidden rounded-lg px-4 py-3.5 text-white">
          <div aria-hidden className="brilho-marca pointer-events-none absolute inset-0" />
          <div className="relative flex items-end justify-between gap-3">
            <div>
              <p className="text-xs text-white/75">Sua carteira já rendeu</p>
              <Valor centavos={comissaoTotal} className="mt-0.5 block text-2xl font-semibold" />
            </div>
            <p className="flex items-center gap-1.5 pb-1 text-sm text-white/75">
              <Users size={15} /> {total} {pluralizar(total, 'cliente', 'clientes')}
            </p>
          </div>
        </section>
      )}

      <div className="relative">
        <Search size={17} aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por nome…" value={busca} className="pl-10"
          autoCapitalize="none" autoCorrect="off" spellCheck={false}
          onChange={e => setBusca(e.target.value)} />
      </div>

      {busca && !isLoading && (
        <p className="text-sm text-muted-foreground">
          {total} {pluralizar(total, 'resultado', 'resultados')}
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
    </div>
  )
}
