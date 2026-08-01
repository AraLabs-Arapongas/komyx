'use client'
import { useEffect, useState } from 'react'

const CORES = ['#0E9E6E', '#3DDC97', '#0B4030', '#F4C95D', '#FFFFFF']
const PECAS = 90
const DURACAO_MS = 4200

type Peca = {
  esquerda: number; atraso: number; duracao: number
  cor: string; escala: number; inclinacao: number
}

/**
 * Nada de peças fora do navegador: `Math.random()` no servidor daria uma queda
 * diferente da do cliente e a hidratação acusaria. Quem pediu menos movimento
 * também não recebe nada — a regra global de `prefers-reduced-motion` zera a
 * duração, o que deixaria as peças paradas na tela em vez de caírem.
 */
function sortearPecas(): Peca[] {
  if (typeof window === 'undefined') return []
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return []
  return Array.from({ length: PECAS }, () => ({
    esquerda: Math.random() * 100,
    atraso: Math.random() * 900,
    duracao: 2600 + Math.random() * 1600,
    cor: CORES[Math.floor(Math.random() * CORES.length)],
    escala: 0.7 + Math.random() * 0.7,
    inclinacao: Math.random() * 360,
  }))
}

/**
 * Chuva de confete sobre a tela inteira. Monte apenas do lado do cliente —
 * quem decide soltar são efeitos e cliques, nunca a renderização do servidor.
 */
export function Confete({ aoTerminar }: { aoTerminar?: () => void }) {
  // inicializador preguiçoso: sorteia uma vez por instância. Recalcular a cada
  // render daria uma queda nova no meio da animação
  const [pecas] = useState<Peca[]>(sortearPecas)

  useEffect(() => {
    const t = setTimeout(() => aoTerminar?.(), pecas.length === 0 ? 0 : DURACAO_MS)
    return () => clearTimeout(t)
  }, [aoTerminar, pecas.length])

  if (pecas.length === 0) return null

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      {pecas.map((p, i) => (
        <span
          key={i}
          className="confete-peca"
          style={{
            left: `${p.esquerda}%`,
            backgroundColor: p.cor,
            animationDelay: `${p.atraso}ms`,
            animationDuration: `${p.duracao}ms`,
            transform: `scale(${p.escala}) rotate(${p.inclinacao}deg)`,
          }}
        />
      ))}
    </div>
  )
}
