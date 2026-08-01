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
import { CampoValor, CampoPercentual, CampoInteiro } from '@/components/campos'
import { Trash2, Plus } from 'lucide-react'

function Secao({ titulo, apoio, children }: { titulo: string; apoio: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-[10px] border bg-card p-4">
      <div className="space-y-1">
        <h2 className="font-medium">{titulo}</h2>
        <p className="text-sm text-muted-foreground">{apoio}</p>
      </div>
      {children}
    </section>
  )
}

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
      // a navegação do app só aparece depois que existe configuração, e quem
      // decide isso é o layout no servidor: sem recarregar, o corretor cairia
      // no painel sem menu nenhum
      window.location.assign('/app')
    } else {
      toast.success('Regras salvas. O mês atual foi recalculado com as novas regras.')
      router.refresh()
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Secao titulo="Política" apoio="Um nome para você reconhecer essa regra de comissão depois.">
        <div className="space-y-1">
          <Label>Nome da política</Label>
          <Input value={nome} onChange={e => setNome(e.target.value)} required />
        </div>
      </Secao>

      <Secao titulo="Faixas" apoio="Comissão calculada pelo total vendido no mês. Deixe o “vendido até” da última faixa em branco.">
        <div className="space-y-3">
          {faixas.map((f, i) => (
            <div key={i} className="space-y-2 rounded-[10px] border p-3">
              <div className="flex items-center justify-between text-sm font-medium">
                <span>Faixa {i + 1} — a partir de {formatBRL(minDaFaixa(i))}</span>
                {faixas.length > 1 && (
                  <button type="button" onClick={() => setFaixas(fs => fs.filter((_, j) => j !== i))}>
                    <Trash2 size={18} className="text-muted-foreground" />
                  </button>)}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label className="text-xs">Vendido até</Label>
                  <CampoValor value={f.maxTxt} placeholder="Sem limite"
                    onChange={v => setFaixas(fs => fs.map((x, j) => j === i ? { ...x, maxTxt: v } : x))} /></div>
                <div><Label className="text-xs">Comissão</Label>
                  <CampoPercentual value={f.percentualTxt} required
                    onChange={v => setFaixas(fs => fs.map((x, j) => j === i ? { ...x, percentualTxt: v } : x))} /></div>
                <div><Label className="text-xs">Parcelas</Label>
                  <CampoInteiro value={f.parcelasTxt} placeholder="2" required
                    onChange={v => setFaixas(fs => fs.map((x, j) => j === i ? { ...x, parcelasTxt: v } : x))} /></div>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm"
            onClick={() => setFaixas(fs => [...fs, { maxTxt: '', percentualTxt: '', parcelasTxt: '' }])}>
            <Plus size={18} /> Adicionar faixa
          </Button>
        </div>
      </Secao>

      <Secao titulo="Calendário" apoio="Vendas até o dia do fechamento entram no mês atual; depois disso, no mês seguinte. A primeira parcela é paga no dia do pagamento do mês seguinte.">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Dia do fechamento</Label>
            <CampoInteiro value={fechamento} onChange={setFechamento} required /></div>
          <div><Label>Dia do pagamento</Label>
            <CampoInteiro value={pagamento} onChange={setPagamento} required /></div>
        </div>
      </Secao>

      <Secao titulo="Estorno" apoio="Opcional. Explique o que acontece com a comissão se o cliente desistir.">
        <Input value={estorno} onChange={e => setEstorno(e.target.value)}
          placeholder="Ex.: estorno integral em caso de desistência" />
      </Secao>

      <Button type="submit" className="w-full" disabled={salvando}>
        {salvando ? 'Salvando…' : 'Salvar regras'}
      </Button>
    </form>
  )
}
