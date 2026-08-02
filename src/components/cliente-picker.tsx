'use client'
import { useEffect, useId, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useClientes } from '@/lib/queries/vendas'
import { criarCliente } from '@/lib/actions/clientes'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Check, Plus, X } from 'lucide-react'

/** Item da lista: um cliente existente ou o atalho de criar com o texto digitado. */
type Sugestao =
  | { tipo: 'cliente'; id: string; nome: string; telefone: string | null }
  | { tipo: 'criar'; nome: string }

/**
 * Autocomplete de cliente.
 *
 * A lista flutua sobre o formulário em vez de empurrá-lo: o corretor digita o
 * nome e o resto dos campos fica onde estava. Criar um cliente novo é a última
 * sugestão, não um botão à parte — quem digita um nome que não existe está
 * quase sempre cadastrando alguém.
 */
export function ClientePicker({ value, nomeSelecionado, onChange }: {
  value: string | null
  nomeSelecionado: string
  onChange: (id: string, nome: string) => void
}) {
  const [texto, setTexto] = useState(nomeSelecionado)
  const [aberto, setAberto] = useState(false)
  const [indice, setIndice] = useState(0)
  const [criando, setCriando] = useState(false)
  const caixaRef = useRef<HTMLDivElement>(null)
  const listaId = useId()

  const qc = useQueryClient()
  // com um cliente escolhido, o texto do campo é o nome dele: buscar por esse
  // nome devolveria só ele, então a lista completa é mais útil ao trocar
  const busca = value && texto === nomeSelecionado ? '' : texto.trim()
  const { data: clientes = [] } = useClientes(busca)

  const digitado = texto.trim()
  const jaExiste = clientes.some(c => c.nome.toLowerCase() === digitado.toLowerCase())
  const sugestoes: Sugestao[] = [
    ...clientes.map((c): Sugestao => ({ tipo: 'cliente', id: c.id, nome: c.nome, telefone: c.telefone })),
    ...(digitado && !jaExiste ? [{ tipo: 'criar', nome: digitado } as Sugestao] : []),
  ]

  // a lista encolhe conforme o corretor digita: o foco não pode ficar apontando
  // para uma posição que já não existe
  const foco = Math.min(indice, Math.max(sugestoes.length - 1, 0))

  function fechar() {
    setAberto(false)
    // texto solto não vira cliente: volta para o que está de fato selecionado
    setTexto(value ? nomeSelecionado : '')
  }

  // clique fora fecha; sem isso a lista fica pendurada sobre os campos
  useEffect(() => {
    if (!aberto) return
    function fora(e: MouseEvent) {
      if (caixaRef.current?.contains(e.target as Node)) return
      setAberto(false)
      setTexto(value ? nomeSelecionado : '')
    }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [aberto, value, nomeSelecionado])

  async function escolher(s: Sugestao) {
    if (s.tipo === 'cliente') {
      onChange(s.id, s.nome)
      setTexto(s.nome)
      setAberto(false)
      return
    }
    setCriando(true)
    const r = await criarCliente({ nome: s.nome, telefone: '', documento: '', observacoes: '' })
    setCriando(false)
    if (!r.ok) { toast.error(r.erro); return }
    qc.invalidateQueries({ queryKey: ['clientes'] })
    onChange(r.id, s.nome)
    setTexto(s.nome)
    setAberto(false)
    toast.success(`Cliente ${s.nome} cadastrado.`)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!aberto) { setAberto(true); return }
      const passo = e.key === 'ArrowDown' ? 1 : -1
      setIndice(i => (i + passo + sugestoes.length) % Math.max(sugestoes.length, 1))
      return
    }
    /*
     * Enter é do picker, sempre — mesmo quando não há sugestão em foco.
     *
     * Antes só era interceptado com sugestão em foco. Nos outros casos ele
     * subia até o <form>, e no último passo do cadastro submit é salvar: o
     * corretor tentava cadastrar o cliente e a venda ia embora sem ele. No
     * celular pior ainda, porque a tecla de ação do teclado faz isso.
     */
    if (e.key === 'Enter') {
      e.preventDefault()
      if (!aberto) { setAberto(true); return }
      if (sugestoes[foco]) escolher(sugestoes[foco])
      return
    }
    if (e.key === 'Escape' && aberto) { e.preventDefault(); fechar() }
  }

  return (
    <div ref={caixaRef} className="relative">
      <Input
        role="combobox"
        aria-expanded={aberto}
        aria-controls={listaId}
        aria-autocomplete="list"
        aria-activedescendant={aberto && sugestoes[foco] ? `${listaId}-${foco}` : undefined}
        value={texto}
        placeholder="Buscar ou criar cliente…"
        disabled={criando}
        onChange={e => { setTexto(e.target.value); setIndice(0); setAberto(true) }}
        onFocus={() => setAberto(true)}
        onKeyDown={onKeyDown}
        className={cn(value && !aberto && 'pr-9')}
      />

      {value && !aberto && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-money">
          <Check size={16} />
        </span>
      )}
      {aberto && texto && (
        <button type="button" aria-label="Limpar"
          onClick={() => { setTexto(''); setIndice(0); setAberto(true) }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1
                     text-muted-foreground hover:text-foreground">
          <X size={14} />
        </button>
      )}

      {aberto && (
        <ul
          id={listaId}
          role="listbox"
          className="absolute z-40 mt-1.5 max-h-56 w-full overflow-y-auto rounded-2xl bg-popover
                     p-1 shadow-lg ring-1 ring-foreground/10"
        >
          {sugestoes.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              Digite o nome do cliente para buscar ou cadastrar.
            </li>
          )}
          {sugestoes.map((s, i) => (
            <li key={s.tipo === 'cliente' ? s.id : 'criar'} id={`${listaId}-${i}`} role="option"
              aria-selected={i === foco}>
              <button
                type="button"
                // mousedown já escolhe: o clique depois do blur chegaria com a lista fechada
                onMouseDown={e => { e.preventDefault(); escolher(s) }}
                onMouseEnter={() => setIndice(i)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm',
                  i === foco && 'bg-secondary',
                )}
              >
                {s.tipo === 'criar' ? (
                  <>
                    <Plus size={16} className="shrink-0 text-money" />
                    <span>Cadastrar <span className="font-medium">{s.nome}</span></span>
                  </>
                ) : (
                  <>
                    <span className="truncate font-medium">{s.nome}</span>
                    {s.telefone && (
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">{s.telefone}</span>
                    )}
                  </>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
