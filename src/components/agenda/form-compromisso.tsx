'use client'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Campo, CampoData, CampoHora } from '@/components/campos'
import { ClientePicker } from '@/components/cliente-picker'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { criarCompromisso, atualizarCompromisso, removerCompromisso } from '@/lib/actions/compromissos'
import { formatData, dataBRParaISO, horaCurta } from '@/lib/format'
import type { Compromisso } from '@/lib/queries/compromissos'

/**
 * Criar e editar compromisso, num diálogo.
 *
 * Diálogo e não página: anotar "ligar pro João" acontece no meio de outra
 * coisa — olhando a lista, no telefone, entre uma visita e outra. Trocar de
 * rota para escrever seis palavras faz a pessoa desistir e anotar no papel,
 * que é exatamente o que este produto veio substituir.
 */
export function FormCompromisso({ aberto, aoFechar, compromisso, dataPadrao }: {
  aberto: boolean
  aoFechar: () => void
  /** ausente = novo */
  compromisso?: Compromisso
  /** dia que o novo compromisso já nasce marcado */
  dataPadrao: string
}) {
  const qc = useQueryClient()
  const editando = compromisso !== undefined

  const [titulo, setTitulo] = useState(compromisso?.titulo ?? '')
  const [data, setData] = useState(formatData(compromisso?.data ?? dataPadrao))
  const [hora, setHora] = useState(horaCurta(compromisso?.hora ?? null))
  const [clienteId, setClienteId] = useState<string | null>(compromisso?.clienteId ?? null)
  const [clienteNome, setClienteNome] = useState(compromisso?.clienteNome ?? '')
  const [nota, setNota] = useState(compromisso?.nota ?? '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    const iso = dataBRParaISO(data)
    if (!iso) { setErro('Informe uma data válida.'); return }
    if (!titulo.trim()) { setErro('Escreva o que precisa ser feito.'); return }
    // meia hora digitada pela metade ("14:") não vira 14:00 por conta própria:
    // salvar um horário que ninguém escolheu é pior que salvar sem horário
    if (hora && !/^\d{2}:\d{2}$/.test(hora)) { setErro('Complete a hora, ou deixe em branco.'); return }

    setSalvando(true)
    const payload = { titulo, data: iso, hora: hora || null, clienteId, nota }
    const r = editando
      ? await atualizarCompromisso(compromisso.id, payload)
      : await criarCompromisso(payload)
    setSalvando(false)
    if (!r.ok) { setErro(r.erro); return }
    qc.invalidateQueries({ queryKey: ['compromissos'] })
    aoFechar()
  }

  async function remover() {
    if (!compromisso) return
    setSalvando(true)
    const r = await removerCompromisso(compromisso.id)
    setSalvando(false)
    if (!r.ok) { toast.error(r.erro); return }
    qc.invalidateQueries({ queryKey: ['compromissos'] })
    toast.success('Compromisso removido.')
    aoFechar()
  }

  return (
    <Dialog open={aberto} onOpenChange={a => { if (!a) aoFechar() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editando ? 'Editar compromisso' : 'Novo compromisso'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={salvar} className="space-y-3">
          <Campo rotulo="O que precisa ser feito" htmlFor="titulo-compromisso" obrigatorio>
            <Input id="titulo-compromisso" value={titulo} autoFocus
              onChange={e => setTitulo(e.target.value)}
              placeholder="Ligar para o Paulo sobre a cota" />
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Dia" htmlFor="data-compromisso" obrigatorio>
              <CampoData id="data-compromisso" value={data} onChange={setData} />
            </Campo>
            <Campo rotulo="Hora" htmlFor="hora-compromisso"
              apoio="Em branco, é do dia.">
              <CampoHora id="hora-compromisso" value={hora} onChange={setHora} />
            </Campo>
          </div>

          <Campo rotulo="Cliente" htmlFor="cliente-compromisso"
            apoio="Opcional — nem toda tarefa é sobre alguém.">
            <ClientePicker value={clienteId} nomeSelecionado={clienteNome}
              onChange={(id, nome) => { setClienteId(id); setClienteNome(nome) }} />
          </Campo>

          <Campo rotulo="Nota" htmlFor="nota-compromisso">
            <Textarea id="nota-compromisso" value={nota} rows={2}
              onChange={e => setNota(e.target.value)}
              placeholder="O que combinaram, o que levar…" />
          </Campo>

          {erro && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {erro}
            </p>
          )}

          <DialogFooter>
            {/* apagar fica na ponta oposta de salvar: são o mesmo tamanho de
                alvo, e no celular o polegar erra */}
            {editando && (
              <Button type="button" variant="ghost" size="toque" disabled={salvando}
                onClick={remover} className="mr-auto text-destructive hover:text-destructive">
                <Trash2 size={18} /> Apagar
              </Button>
            )}
            <Button type="button" variant="outline" size="toque" onClick={aoFechar}>
              Cancelar
            </Button>
            <Button type="submit" size="toque" disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
