'use client'
import { useEffect, useRef } from 'react'

/** rede de segurança: passou disto sem o observer disparar, revela assim mesmo */
const LIMITE_MS = 4000

/**
 * Revela o conteúdo quando ele entra na tela, com um leve deslize para cima.
 *
 * O conteúdo nasce VISÍVEL e o JavaScript é quem esconde, logo antes de
 * animar. Já foi o contrário e custou caro: o `_next` foi bloqueado no
 * celular, a hidratação não aconteceu, e a página inteira ficou em branco
 * abaixo do hero. Numa página pública, texto que só aparece se o JS rodar é
 * texto que um dia não aparece.
 *
 * Três saídas garantem isso:
 * - sem JS ou sem hidratação, nada é escondido;
 * - o que já está na tela quando o componente monta nem chega a ser escondido;
 * - se o observador não disparar em 4s, revela do mesmo jeito.
 */
export function Revela({ children, atraso = 0, className }: {
  children: React.ReactNode
  /** em ms, para escalonar itens de uma grade */
  atraso?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // já na tela: animar agora seria um piscar, não uma entrada
    if (el.getBoundingClientRect().top < window.innerHeight) return

    el.dataset.revela = '0'
    const revelar = () => { el.dataset.revela = '1' }

    const obs = new IntersectionObserver(([entrada]) => {
      if (!entrada.isIntersecting) return
      revelar()
      obs.disconnect()
    }, { rootMargin: '0px 0px -8% 0px' })
    obs.observe(el)

    const seguro = setTimeout(() => { revelar(); obs.disconnect() }, LIMITE_MS)
    return () => { clearTimeout(seguro); obs.disconnect() }
  }, [])

  return (
    <div
      ref={ref}
      style={atraso ? { transitionDelay: `${atraso}ms` } : undefined}
      className={className}
    >
      {children}
    </div>
  )
}
