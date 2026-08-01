'use client'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useClientes } from '@/lib/queries/vendas'
import { criarCliente } from '@/lib/actions/clientes'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function ClientePicker({ value, nomeSelecionado, onChange }: {
  value: string | null
  nomeSelecionado: string
  onChange: (id: string, nome: string) => void
}) {
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState(false)
  const { data: clientes = [] } = useClientes(busca)
  const qc = useQueryClient()

  if (value && !aberto)
    return (
      <div className="flex items-center justify-between rounded-[10px] border px-3 py-2">
        <span>{nomeSelecionado}</span>
        <button type="button" className="text-sm text-muted-foreground underline"
          onClick={() => setAberto(true)}>trocar</button>
      </div>
    )

  return (
    <div className="space-y-2">
      <Input placeholder="Buscar ou criar cliente…" value={busca}
        onChange={e => setBusca(e.target.value)} autoFocus />
      <div className="max-h-40 space-y-1 overflow-y-auto">
        {clientes.map(c => (
          <button key={c.id} type="button"
            className="block w-full rounded-[10px] border px-3 py-2 text-left hover:bg-background"
            onClick={() => { onChange(c.id, c.nome); setAberto(false); setBusca('') }}>
            {c.nome}
          </button>
        ))}
        {busca.trim() && !clientes.some(c => c.nome.toLowerCase() === busca.trim().toLowerCase()) && (
          <Button type="button" variant="outline" className="w-full" onClick={async () => {
            const r = await criarCliente({ nome: busca.trim(), telefone: '', documento: '', observacoes: '' })
            if (!r.ok) { toast.error(r.erro); return }
            qc.invalidateQueries({ queryKey: ['clientes'] })
            onChange(r.id, busca.trim()); setAberto(false); setBusca('')
          }}>Criar cliente "{busca.trim()}"</Button>
        )}
      </div>
    </div>
  )
}
