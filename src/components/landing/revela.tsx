'use client'
import { useEffect, useRef, useState } from 'react'

/**
 * Revela o conteúdo quando ele entra na tela, com um leve deslize para cima.
 *
 * O estado escondido só existe com JavaScript ligado (`@media (scripting)` no
 * CSS): sem JS a página fica inteira visível, nunca em branco. E quem pediu
 * menos movimento não vê deslize — a regra global de reduced-motion zera as
 * durações.
 */
export function Revela({ children, atraso = 0, className }: {
  children: React.ReactNode
  /** em ms, para escalonar itens de uma grade */
  atraso?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // sem o observer (navegador antigo), melhor tudo visível que tudo escondido
    if (!('IntersectionObserver' in window)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisivel(true)
      return
    }
    const obs = new IntersectionObserver(([entrada]) => {
      if (entrada.isIntersecting) {
        setVisivel(true)
        obs.disconnect()
      }
    }, { rootMargin: '0px 0px -10% 0px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      data-revela={visivel ? '1' : '0'}
      style={atraso ? { transitionDelay: `${atraso}ms` } : undefined}
      className={className}
    >
      {children}
    </div>
  )
}
