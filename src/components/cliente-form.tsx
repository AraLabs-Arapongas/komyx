'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { criarCliente, atualizarCliente } from '@/lib/actions/clientes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function ClienteForm({ clienteId, inicial, aoSalvar }: {
  clienteId?: string
  inicial?: { nome: string; telefone: string; email: string; documento: string; cidade: string; observacoes: string }
  /** Chamado após salvar uma edição, para o pai sair do modo edição.
   *  Necessário porque `router.push` para a rota atual não remonta a
   *  página (mesma URL), então o estado do pai não se resolve sozinho. */
  aoSalvar?: () => void
}) {
  const router = useRouter()
  const qc = useQueryClient()
  const [nome, setNome] = useState(inicial?.nome ?? '')
  const [telefone, setTelefone] = useState(inicial?.telefone ?? '')
  const [email, setEmail] = useState(inicial?.email ?? '')
  const [documento, setDocumento] = useState(inicial?.documento ?? '')
  const [cidade, setCidade] = useState(inicial?.cidade ?? '')
  const [observacoes, setObservacoes] = useState(inicial?.observacoes ?? '')
  const [salvando, setSalvando] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) { toast.error('Informe o nome do cliente.'); return }
    setSalvando(true)
    const payload = { nome: nome.trim(), telefone, documento, observacoes, email, cidade }
    if (clienteId) {
      const r = await atualizarCliente(clienteId, payload)
      setSalvando(false)
      if (!r.ok) { toast.error(r.erro); return }
      qc.invalidateQueries()
      toast.success('Cliente atualizado.')
      if (aoSalvar) {
        aoSalvar()
      } else {
        router.push(`/app/clientes/${clienteId}`)
        router.refresh()
      }
      return
    }
    const r = await criarCliente(payload)
    setSalvando(false)
    if (!r.ok) { toast.error(r.erro); return }
    qc.invalidateQueries()
    toast.success('Cliente cadastrado.')
    router.push(`/app/clientes/${r.id}`)
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome" required autoFocus />
      <Input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="Telefone" />
      <Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="E-mail" />
      <Input value={documento} onChange={e => setDocumento(e.target.value)} placeholder="Documento (opcional)" />
      <Input value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Cidade" />
      <Input value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Observações" />
      <Button type="submit" className="w-full" disabled={salvando}>
        {salvando ? 'Salvando…' : 'Salvar cliente'}
      </Button>
    </form>
  )
}
