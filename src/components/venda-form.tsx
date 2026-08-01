'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { criarVenda, editarVenda } from '@/lib/actions/vendas'
import { parseBRLParaCentavos } from '@/lib/format'
import { ClientePicker } from './cliente-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function hojeSP(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}

export function VendaForm({ vendaId, inicial }: {
  vendaId?: string
  inicial?: { clienteId: string; clienteNome: string; valorTxt: string; administradora: string;
              grupo: string; cota: string; dataVenda: string; observacoes: string }
}) {
  const router = useRouter()
  const qc = useQueryClient()
  const [clienteId, setClienteId] = useState<string | null>(inicial?.clienteId ?? null)
  const [clienteNome, setClienteNome] = useState(inicial?.clienteNome ?? '')
  const [valorTxt, setValorTxt] = useState(inicial?.valorTxt ?? '')
  const [administradora, setAdministradora] = useState(inicial?.administradora ?? '')
  const [grupo, setGrupo] = useState(inicial?.grupo ?? '')
  const [cota, setCota] = useState(inicial?.cota ?? '')
  const [dataVenda, setDataVenda] = useState(inicial?.dataVenda ?? hojeSP())
  const [observacoes, setObservacoes] = useState(inicial?.observacoes ?? '')
  const [salvando, setSalvando] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clienteId) { toast.error('Selecione um cliente.'); return }
    setSalvando(true)
    const payload = {
      clienteId, valorCartaCentavos: parseBRLParaCentavos(valorTxt),
      administradora, grupo, cota, dataVenda, observacoes,
    }
    const r = vendaId ? await editarVenda(vendaId, payload) : await criarVenda(payload)
    setSalvando(false)
    if (!r.ok) { toast.error(r.erro); return }
    qc.invalidateQueries()
    toast.success(vendaId ? 'Venda atualizada. Comissões recalculadas.'
                          : 'Venda registrada. Comissão calculada automaticamente.')
    router.push('/app/vendas')
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1"><Label>Cliente</Label>
        <ClientePicker value={clienteId} nomeSelecionado={clienteNome}
          onChange={(id, nome) => { setClienteId(id); setClienteNome(nome) }} /></div>
      <div className="space-y-1"><Label>Valor da carta (R$)</Label>
        <Input inputMode="decimal" placeholder="500.000,00" value={valorTxt}
          onChange={e => setValorTxt(e.target.value)} required /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label>Administradora</Label>
          <Input value={administradora} onChange={e => setAdministradora(e.target.value)} required /></div>
        <div className="space-y-1"><Label>Data da venda</Label>
          <Input type="date" value={dataVenda} onChange={e => setDataVenda(e.target.value)} required /></div>
        <div className="space-y-1"><Label>Grupo</Label>
          <Input value={grupo} onChange={e => setGrupo(e.target.value)} required /></div>
        <div className="space-y-1"><Label>Cota</Label>
          <Input value={cota} onChange={e => setCota(e.target.value)} required /></div>
      </div>
      <div className="space-y-1"><Label>Observações (opcional)</Label>
        <Input value={observacoes} onChange={e => setObservacoes(e.target.value)} /></div>
      <Button type="submit" className="w-full" disabled={salvando}>
        {salvando ? 'Salvando…' : 'Salvar venda'}
      </Button>
    </form>
  )
}
