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
import { ROTULOS_ESTORNO, type PoliticaEstorno } from '@/lib/domain/types'
import { cn } from '@/lib/utils'
import { Trash2, Plus } from 'lucide-react'

function Secao({ titulo, apoio, children }: { titulo: string; apoio: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-[10px] border bg-card p-4 md:p-5">
      <div className="space-y-1">
        <h2 className="font-medium">{titulo}</h2>
        <p className="text-sm text-muted-foreground">{apoio}</p>
      </div>
      {children}
    </section>
  )
}

type FaixaDraft = { maxTxt: string; percentualTxt: string; parcelasTxt: string; semLimite: boolean }

export function ConfigForm({ modo, inicial }: {
  modo: 'onboarding' | 'edicao'
  inicial?: { nomePolitica: string; faixas: { max: number | null; percentual: number; parcelas: number }[];
              diaFechamento: number; diaPrimeiroPagamento: number; politicaEstorno: PoliticaEstorno }
}) {
  const router = useRouter()
  const qc = useQueryClient()
  const [nome, setNome] = useState(inicial?.nomePolitica ?? 'Política do escritório')
  const [faixas, setFaixas] = useState<FaixaDraft[]>(
    inicial?.faixas.map(f => ({
      maxTxt: f.max === null ? '' : (f.max / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      // duas casas para bater com a máscara: sem isso, "0,5" viraria "0,05"
      // assim que o corretor tocasse no campo
      percentualTxt: f.percentual.toFixed(2).replace('.', ','),
      parcelasTxt: String(f.parcelas),
      semLimite: f.max === null,
    })) ?? [{ maxTxt: '', percentualTxt: '', parcelasTxt: '', semLimite: true }])
  const [fechamento, setFechamento] = useState(String(inicial?.diaFechamento ?? 25))
  const [pagamento, setPagamento] = useState(String(inicial?.diaPrimeiroPagamento ?? 10))
  const [estorno, setEstorno] = useState<PoliticaEstorno>(inicial?.politicaEstorno ?? 'perguntar')
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
        max: f.semLimite || f.maxTxt.trim() === '' ? null : parseBRLParaCentavos(f.maxTxt),
        percentual: parseFloat(f.percentualTxt.replace(',', '.')) || 0,
        parcelas: parseInt(f.parcelasTxt) || 0,
      })),
      diaFechamento: parseInt(fechamento) || 0,
      diaPrimeiroPagamento: parseInt(pagamento) || 0,
      politicaEstorno: estorno,
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
    <form onSubmit={onSubmit} className="space-y-5">
      <Secao titulo="Política" apoio="Um nome para você reconhecer essa regra de comissão depois.">
        <div className="space-y-1">
          <Label>Nome da política</Label>
          <Input value={nome} onChange={e => setNome(e.target.value)} required />
        </div>
      </Secao>

      <Secao titulo="Faixas" apoio="Comissão calculada pelo total vendido no mês. Deixe o “vendido até” da última faixa em branco.">
        <div className="space-y-3">
          {faixas.map((f, i) => (
            <div key={i} className="space-y-3 rounded-[10px] border p-3">
              <div className="flex items-center justify-between text-sm font-medium">
                <span>Faixa {i + 1} — a partir de {formatBRL(minDaFaixa(i))}</span>
                {faixas.length > 1 && (
                  <button type="button" onClick={() => setFaixas(fs => fs.filter((_, j) => j !== i))}>
                    <Trash2 size={18} className="text-muted-foreground" />
                  </button>)}
              </div>
              {/* no celular os três campos lado a lado truncam o "Sem limite":
                  o valor ocupa a linha inteira e os dois curtos dividem a de baixo */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <div className="col-span-2 space-y-1 sm:col-span-1">
                  <Label className="text-xs">Vendido até</Label>
                  <CampoValor value={f.maxTxt} placeholder="Sem limite" disabled={f.semLimite}
                    onChange={v => setFaixas(fs => fs.map((x, j) => j === i ? { ...x, maxTxt: v } : x))} />
                  <label className="flex cursor-pointer items-center gap-2 pt-1 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      className="size-3.5 cursor-pointer accent-foreground"
                      checked={f.semLimite}
                      onChange={e => setFaixas(fs => fs.map((x, j) =>
                        // limpa o valor ao marcar: guardar um teto que não vale
                        // mais só criaria dúvida na próxima edição
                        j === i ? { ...x, semLimite: e.target.checked, maxTxt: e.target.checked ? '' : x.maxTxt } : x))}
                    />
                    Sem limite
                  </label>
                </div>
                <div className="space-y-1"><Label className="text-xs">Comissão</Label>
                  <CampoPercentual value={f.percentualTxt} required
                    onChange={v => setFaixas(fs => fs.map((x, j) => j === i ? { ...x, percentualTxt: v } : x))} /></div>
                <div className="space-y-1"><Label className="text-xs">Parcelas</Label>
                  <CampoInteiro value={f.parcelasTxt} placeholder="2" required
                    onChange={v => setFaixas(fs => fs.map((x, j) => j === i ? { ...x, parcelasTxt: v } : x))} /></div>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm"
            // só a última faixa pode ficar aberta: a que era a última passa a
            // precisar de um teto
            onClick={() => setFaixas(fs => [
              ...fs.map(x => ({ ...x, semLimite: false })),
              { maxTxt: '', percentualTxt: '', parcelasTxt: '', semLimite: true },
            ])}>
            <Plus size={18} /> Adicionar faixa
          </Button>
        </div>
      </Secao>

      <Secao titulo="Calendário" apoio="Vendas até o dia do fechamento entram no mês atual; depois disso, no mês seguinte. A primeira parcela é paga no dia do pagamento do mês seguinte.">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Dia do fechamento</Label>
            <CampoInteiro value={fechamento} onChange={setFechamento} required /></div>
          <div className="space-y-1"><Label>Dia do pagamento</Label>
            <CampoInteiro value={pagamento} onChange={setPagamento} required /></div>
        </div>
      </Secao>

      <Secao titulo="Estorno" apoio="O que o escritório faz com a sua comissão quando o cliente desiste da cota.">
        <div className="space-y-2">
          {(Object.keys(ROTULOS_ESTORNO) as PoliticaEstorno[]).map(opcao => (
            <label
              key={opcao}
              className={cn('flex cursor-pointer gap-3 rounded-[10px] border p-3',
                estorno === opcao ? 'border-foreground/40 bg-background' : 'hover:bg-background')}
            >
              <input
                type="radio"
                name="politica-estorno"
                className="mt-0.5 size-4 shrink-0 cursor-pointer accent-foreground"
                checked={estorno === opcao}
                onChange={() => setEstorno(opcao)}
              />
              <span className="space-y-0.5">
                <span className="block text-sm font-medium">{ROTULOS_ESTORNO[opcao].titulo}</span>
                <span className="block text-sm text-muted-foreground">{ROTULOS_ESTORNO[opcao].apoio}</span>
              </span>
            </label>
          ))}
        </div>
      </Secao>

      <Button type="submit" className="w-full" disabled={salvando}>
        {salvando ? 'Salvando…' : 'Salvar regras'}
      </Button>
    </form>
  )
}
