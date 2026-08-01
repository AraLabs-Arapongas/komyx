'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { salvarConfig } from '@/lib/actions/config'
import { parseBRLParaCentavos, formatBRL } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2, Plus } from 'lucide-react'

type FaixaDraft = { maxTxt: string; percentualTxt: string; parcelasTxt: string }

export function ConfigForm({ modo, inicial }: {
  modo: 'onboarding' | 'edicao'
  inicial?: { nomePolitica: string; faixas: { max: number | null; percentual: number; parcelas: number }[];
              diaFechamento: number; diaPrimeiroPagamento: number; regrasEstorno: string }
}) {
  const router = useRouter()
  const qc = useQueryClient()
  const [nome, setNome] = useState(inicial?.nomePolitica ?? 'Política do escritório')
  const [faixas, setFaixas] = useState<FaixaDraft[]>(
    inicial?.faixas.map(f => ({
      maxTxt: f.max === null ? '' : (f.max / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      percentualTxt: String(f.percentual).replace('.', ','),
      parcelasTxt: String(f.parcelas),
    })) ?? [{ maxTxt: '', percentualTxt: '', parcelasTxt: '' }])
  const [fechamento, setFechamento] = useState(String(inicial?.diaFechamento ?? 25))
  const [pagamento, setPagamento] = useState(String(inicial?.diaPrimeiroPagamento ?? 10))
  const [estorno, setEstorno] = useState(inicial?.regrasEstorno ?? '')
  const [salvando, setSalvando] = useState(false)

  function minDaFaixa(i: number): number {
    if (i === 0) return 0
    const antMax = parseBRLParaCentavos(faixas[i - 1].maxTxt)
    return antMax + 1
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    const payload = {
      nomePolitica: nome,
      faixas: faixas.map((f, i) => ({
        min: minDaFaixa(i),
        max: f.maxTxt.trim() === '' ? null : parseBRLParaCentavos(f.maxTxt),
        percentual: parseFloat(f.percentualTxt.replace(',', '.')) || 0,
        parcelas: parseInt(f.parcelasTxt) || 0,
      })),
      diaFechamento: parseInt(fechamento) || 0,
      diaPrimeiroPagamento: parseInt(pagamento) || 0,
      regrasEstorno: estorno,
    }
    const r = await salvarConfig(payload)
    setSalvando(false)
    if (!r.ok) { toast.error(r.erro); return }
    qc.invalidateQueries()
    if (modo === 'onboarding') {
      toast.success('Tudo pronto! Agora é só registrar suas vendas.')
      router.push('/app')
    } else {
      toast.success('Regras salvas. O mês atual foi recalculado com as novas regras.')
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-1">
        <Label>Nome da política</Label>
        <Input value={nome} onChange={e => setNome(e.target.value)} required />
      </div>

      <div className="space-y-3">
        <Label>Faixas de comissão</Label>
        <p className="text-sm text-muted-foreground">
          Comissão calculada pelo total vendido no mês. Deixe o “valor até” da última faixa em branco.
        </p>
        {faixas.map((f, i) => (
          <div key={i} className="space-y-2 rounded-[10px] border p-3">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>Faixa {i + 1} — a partir de {formatBRL(minDaFaixa(i))}</span>
              {faixas.length > 1 && (
                <button type="button" onClick={() => setFaixas(fs => fs.filter((_, j) => j !== i))}>
                  <Trash2 size={16} className="text-muted-foreground" />
                </button>)}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label className="text-xs">Vendido até (R$)</Label>
                <Input inputMode="decimal" placeholder="Sem limite" value={f.maxTxt}
                  onChange={e => setFaixas(fs => fs.map((x, j) => j === i ? { ...x, maxTxt: e.target.value } : x))} /></div>
              <div><Label className="text-xs">Comissão (%)</Label>
                <Input inputMode="decimal" placeholder="0,5" value={f.percentualTxt} required
                  onChange={e => setFaixas(fs => fs.map((x, j) => j === i ? { ...x, percentualTxt: e.target.value } : x))} /></div>
              <div><Label className="text-xs">Parcelas</Label>
                <Input inputMode="numeric" placeholder="2" value={f.parcelasTxt} required
                  onChange={e => setFaixas(fs => fs.map((x, j) => j === i ? { ...x, parcelasTxt: e.target.value } : x))} /></div>
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm"
          onClick={() => setFaixas(fs => [...fs, { maxTxt: '', percentualTxt: '', parcelasTxt: '' }])}>
          <Plus size={16} /> Adicionar faixa
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div><Label>Dia do fechamento</Label>
          <Input inputMode="numeric" value={fechamento} onChange={e => setFechamento(e.target.value)} required /></div>
        <div><Label>Dia do pagamento</Label>
          <Input inputMode="numeric" value={pagamento} onChange={e => setPagamento(e.target.value)} required /></div>
      </div>
      <p className="text-sm text-muted-foreground">
        Vendas até o dia do fechamento entram no mês atual; depois disso, no mês seguinte.
        A primeira parcela é paga no dia do pagamento do mês seguinte.
      </p>

      <div className="space-y-1">
        <Label>Regras de estorno (opcional)</Label>
        <Input value={estorno} onChange={e => setEstorno(e.target.value)}
          placeholder="Ex.: estorno integral em caso de desistência" />
      </div>

      <Button type="submit" className="w-full" disabled={salvando}>
        {salvando ? 'Salvando…' : 'Salvar regras'}
      </Button>
    </form>
  )
}
