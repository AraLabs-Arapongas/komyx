'use client'
import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BarraAcao } from '@/components/ui/barra-acao'
import { cn } from '@/lib/utils'

export type Passo = {
  /** aparece no topo, dizendo o que se responde nesta tela */
  titulo: string
  conteudo: React.ReactNode
}

/**
 * Formulário em passos: trilha no topo, um passo por vez, ações no pé.
 *
 * Existe porque esta era a terceira cópia da mesma mecânica no projeto —
 * nova venda, onboarding e ajustes — e as três já divergiam no rótulo do
 * progresso e no comportamento do Enter.
 *
 * A validação fica com quem usa, através de `podeAvancar`: só o formulário
 * sabe qual campo ficou faltando, e é lá que o erro precisa pintar de vermelho.
 * Devolver `false` segura o passo sem dizer nada aqui.
 */
export function Passos({ passos, rotuloFinal, aoConcluir, podeAvancar, ocupado, onKeyDownExtra }: {
  passos: Passo[]
  rotuloFinal: string
  aoConcluir: () => void
  /** chamado antes de sair do passo `indice`; false segura */
  podeAvancar?: (indice: number) => boolean
  ocupado?: boolean
  onKeyDownExtra?: (e: React.KeyboardEvent<HTMLFormElement>) => void
}) {
  const [passo, setPasso] = useState(0)
  const ultimo = passos.length - 1

  function avancar() {
    if (podeAvancar && !podeAvancar(passo)) return
    setPasso(p => Math.min(p + 1, ultimo))
  }

  function concluir() {
    // valida tudo, não só o passo visível: quem chegou até aqui pode ter voltado
    // e esvaziado um campo lá atrás
    for (let p = 0; p <= ultimo; p++) {
      if (podeAvancar && !podeAvancar(p)) { setPasso(p); return }
    }
    aoConcluir()
  }

  /*
   * Enter dentro de um campo nunca conclui.
   *
   * Um formulário envia sozinho quando se tecla Enter em qualquer input, e o
   * último passo é o de gravar. Aqui a tecla avança enquanto houver passo à
   * frente, e no último não faz nada: concluir exige o botão.
   */
  function onKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    onKeyDownExtra?.(e)
    if (e.key !== 'Enter' || e.defaultPrevented) return
    // tecla segurada repete o keydown dezenas de vezes por segundo
    if (e.repeat) { e.preventDefault(); return }
    const alvo = e.target as HTMLElement
    if (alvo.tagName === 'BUTTON' || alvo.tagName === 'TEXTAREA') return
    e.preventDefault()
    if (passo < ultimo) avancar()
  }

  return (
    <form
      onSubmit={e => { e.preventDefault(); concluir() }}
      onKeyDown={onKeyDown}
      noValidate
      className="flex flex-1 flex-col"
    >
      <div className="mb-6 space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium">{passos[passo].titulo}</p>
          <p className="shrink-0 text-xs text-muted-foreground">
            Passo {passo + 1} de {passos.length}
          </p>
        </div>
        {/* barra fina em vez de bolinhas: ocupa menos e diz a mesma coisa */}
        <div className="flex gap-1">
          {passos.map((_, i) => (
            <span key={i} className={cn('h-1 flex-1 rounded-full transition-colors',
              i <= passo ? 'bg-primary' : 'bg-border')} />
          ))}
        </div>
      </div>

      <div className="flex-1">{passos[passo].conteudo}</div>

      <BarraAcao>
        {passo > 0 && (
          <Button type="button" variant="outline" size="toque" onClick={() => setPasso(p => p - 1)}>
            <ChevronLeft size={18} /> Voltar
          </Button>
        )}
        {/*
          Chaves distintas: sem elas o React reaproveita o mesmo nó quando
          "Continuar" vira o botão final, e ele chega ao último passo já com o
          foco — Enter repetido então atravessava o formulário e gravava sozinho.
        */}
        {passo < ultimo ? (
          <Button key="continuar" type="button" size="toque" className="flex-1" onClick={avancar}>
            Continuar
          </Button>
        ) : (
          <Button key="concluir" type="submit" size="toque" className="flex-1" disabled={ocupado}>
            {ocupado ? 'Salvando…' : rotuloFinal}
          </Button>
        )}
      </BarraAcao>
    </form>
  )
}
