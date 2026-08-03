'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Valor } from '@/components/valor'
import { Input } from '@/components/ui/input'
import { formatData } from '@/lib/format'
import { Search, X } from 'lucide-react'

type Resultado =
  | { tipo: 'venda'; id: string; titulo: string; apoio: string; centavos: number | null }
  | { tipo: 'cliente'; id: string; titulo: string; apoio: string }

/** PostgREST trata vírgula e parênteses como sintaxe do filtro `or`. */
function limpar(termo: string): string {
  return termo.replace(/[,()%]/g, ' ').trim()
}

export function BuscaGlobal({ className }: { className?: string } = {}) {
  const [aberto, setAberto] = useState(false)
  const [termo, setTermo] = useState('')
  const router = useRouter()
  const campoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (aberto) campoRef.current?.focus()
  }, [aberto])

  useEffect(() => {
    function atalho(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setAberto(true) }
      if (e.key === 'Escape') setAberto(false)
    }
    window.addEventListener('keydown', atalho)
    return () => window.removeEventListener('keydown', atalho)
  }, [])

  const busca = limpar(termo)
  const { data: resultados = [] } = useQuery({
    queryKey: ['busca-global', busca],
    enabled: busca.length >= 2,
    queryFn: async (): Promise<Resultado[]> => {
      const supabase = createClient()
      const [vendas, clientes] = await Promise.all([
        supabase.from('vendas')
          .select('id, valor_carta_centavos, administradora, grupo, cota, data_venda, numero_contrato, observacoes, clientes(nome), comissoes(valor_centavos)')
          .or(`grupo.ilike.%${busca}%,cota.ilike.%${busca}%,administradora.ilike.%${busca}%,numero_contrato.ilike.%${busca}%,observacoes.ilike.%${busca}%`)
          .limit(6),
        supabase.from('clientes').select('id, nome, telefone, cidade')
          .ilike('nome', `%${busca}%`).limit(4),
      ])

      const porCliente = await supabase.from('vendas')
        .select('id, valor_carta_centavos, administradora, grupo, cota, data_venda, clientes!inner(nome), comissoes(valor_centavos)')
        .ilike('clientes.nome', `%${busca}%`).limit(6)

      const mapaVendas = new Map<string, Resultado>()
      for (const v of [...(vendas.data ?? []), ...(porCliente.data ?? [])]) {
        const cliente = (v.clientes as { nome: string } | null)?.nome ?? 'Sem cliente'
        const comissao = v.comissoes as { valor_centavos: number } | null
        mapaVendas.set(v.id, {
          tipo: 'venda', id: v.id, titulo: cliente,
          apoio: `${v.administradora} · G${v.grupo} · C${v.cota} · ${formatData(v.data_venda)}`,
          centavos: comissao ? Number(comissao.valor_centavos) : null,
        })
      }

      return [
        ...mapaVendas.values(),
        ...(clientes.data ?? []).map((c): Resultado => ({
          tipo: 'cliente', id: c.id, titulo: c.nome,
          apoio: [c.telefone, c.cidade].filter(Boolean).join(' · ') || 'Cliente',
        })),
      ]
    },
  })

  function abrir(r: Resultado) {
    setAberto(false)
    setTermo('')
    router.push(r.tipo === 'venda' ? `/app/vendas/${r.id}` : `/app/clientes/${r.id}`)
  }

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)}
        aria-label="Buscar"
        className={cn('rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground', className)}>
        <Search size={18} />
      </button>
    )
  }

  return (
    /* longe do topo: colada no cabeçalho a busca parecia parte dele, e o
       escurecido atrás nem aparecia. O recuo é maior no celular, onde a tela
       inteira é a caixa. */
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-24 md:pt-[14vh]"
      onClick={() => setAberto(false)}>
      {/*
        `text-foreground` explícito: no painel o cabeçalho é branco sobre a
        aurora, e a busca nasce dentro dele. `fixed` tira do fluxo, não da
        herança — o painel abria com título, campo e tudo em branco sobre o
        cartão branco, invisível só nessa tela.
      */}
      <div className="entra w-full max-w-xl overflow-hidden rounded-lg bg-card text-foreground shadow-xl"
        onClick={e => e.stopPropagation()}>
        {/* a altura vem do campo (`nu`, 56px), e não de padding aqui: assim a
            linha do cursor fica no centro da faixa, e não empurrada por cima */}
        <div className="flex items-center gap-3 border-b px-4">
          <Search size={20} className="shrink-0 text-muted-foreground" />
          <Input
            ref={campoRef}
            tamanho="nu"
            value={termo}
            onChange={e => setTermo(e.target.value)}
            placeholder="Buscar cliente, grupo, cota, contrato…"
          />
          <button type="button" onClick={() => setAberto(false)} aria-label="Fechar"
            className="-mr-1.5 shrink-0 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {busca.length < 2 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Digite ao menos duas letras para buscar.
            </p>
          ) : resultados.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Nada encontrado para “{termo}”.
            </p>
          ) : (
            <ul className="divide-y">
              {resultados.map(r => (
                <li key={`${r.tipo}-${r.id}`}>
                  <button type="button" onClick={() => abrir(r)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-background">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{r.titulo}</span>
                      <span className="block truncate text-xs text-muted-foreground">{r.apoio}</span>
                    </span>
                    {r.tipo === 'venda'
                      ? (r.centavos !== null
                        ? <Valor centavos={r.centavos} className="shrink-0 text-sm" />
                        : <span className="shrink-0 text-sm text-muted-foreground">—</span>)
                      : <span className="shrink-0 text-xs text-muted-foreground">Cliente</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
