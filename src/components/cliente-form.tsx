'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { criarCliente, atualizarCliente } from '@/lib/actions/clientes'
import { Campo } from '@/components/campos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { BarraAcao } from '@/components/ui/barra-acao'

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

  /*
   * Só o nome é obrigatório — é o que distingue um cliente de outro. O resto o
   * corretor completa quando tiver: exigir telefone de quem ele acabou de
   * conhecer só produz campo preenchido com qualquer coisa.
   *
   * O erro nasce depois da tentativa de salvar, não enquanto se digita, e some
   * assim que o campo é corrigido.
   */
  const [erroNome, setErroNome] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) { setErroNome('Informe o nome do cliente.'); return }
    setErroNome(null)
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

  /*
   * noValidate: a validação é nossa. Sem isto o navegador barra o envio com o
   * balão dele, que some ao rolar, não diz qual campo quando são vários e
   * ignora o vermelho que acabamos de ligar no Input.
   */
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-1 flex-col">
      <div className="flex-1 space-y-4">
        <Campo rotulo="Nome" htmlFor="nome" obrigatorio erro={erroNome ?? undefined}>
          <Input id="nome" value={nome} required autoFocus aria-invalid={!!erroNome}
            onChange={e => { setNome(e.target.value); if (erroNome) setErroNome(null) }} />
        </Campo>

        <Campo rotulo="Telefone" htmlFor="telefone">
          <Input id="telefone" value={telefone} type="tel" inputMode="tel"
            onChange={e => setTelefone(e.target.value)} />
        </Campo>

        <Campo rotulo="E-mail" htmlFor="email">
          <Input id="email" value={email} type="email" inputMode="email"
            autoCapitalize="none" autoCorrect="off" spellCheck={false}
            onChange={e => setEmail(e.target.value)} />
        </Campo>

        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Documento" htmlFor="documento">
            <Input id="documento" value={documento} onChange={e => setDocumento(e.target.value)} />
          </Campo>
          <Campo rotulo="Cidade" htmlFor="cidade">
            <Input id="cidade" value={cidade} onChange={e => setCidade(e.target.value)} />
          </Campo>
        </div>

        <Campo rotulo="Observações" htmlFor="observacoes">
          <Textarea id="observacoes" value={observacoes} rows={4}
            placeholder="Como conheceu, o que procura, o que lembrar depois…"
            onChange={e => setObservacoes(e.target.value)} />
        </Campo>
      </div>

      <BarraAcao>
        <Button type="submit" size="toque" className="flex-1" disabled={salvando}>
          {salvando ? 'Salvando…' : clienteId ? 'Salvar alterações' : 'Salvar cliente'}
        </Button>
      </BarraAcao>
    </form>
  )
}
