'use client'
import { useEffect, useState } from 'react'

/**
 * O valor do mockup sobe de R$ 0 até o total quando a página abre.
 *
 * É o "cálculo acontecendo" em um segundo e meio — a promessa da página em
 * movimento. Quem pediu menos animação no sistema vê o número já pronto.
 */
export function NumeroAnimado({ ateCentavos, duracaoMs = 1500 }: {
  ateCentavos: number
  duracaoMs?: number
}) {
  const [centavos, setCentavos] = useState(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // decisão depende de media query do navegador: não dá para derivar no render
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCentavos(ateCentavos)
      return
    }
    let raf = 0
    const inicio = performance.now()
    const tique = (agora: number) => {
      const p = Math.min((agora - inicio) / duracaoMs, 1)
      const suave = 1 - Math.pow(1 - p, 3)
      setCentavos(Math.round(ateCentavos * suave))
      if (p < 1) raf = requestAnimationFrame(tique)
    }
    raf = requestAnimationFrame(tique)
    return () => cancelAnimationFrame(raf)
  }, [ateCentavos, duracaoMs])

  return <>{(centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</>
}
