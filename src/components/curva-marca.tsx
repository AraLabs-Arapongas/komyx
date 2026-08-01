import { cn } from '@/lib/utils'

/**
 * A curva de crescimento — a assinatura gráfica do Komyx.
 *
 * É o mesmo traço em toda superfície da marca: landing, telas de entrada,
 * onboarding e o painel do corretor. Repetido nos mesmos lugares, com o mesmo
 * ângulo, ele vira reconhecível sozinho — é o papel que as curvas cumprem na
 * Stripe e as auroras na Arc.
 *
 * Fica atrás do conteúdo e nunca compete com ele: opacidade baixa e
 * `aria-hidden`, porque não carrega informação alguma.
 */
export function CurvaMarca({ className, intensidade = 'normal' }: {
  className?: string
  /** `forte` para blocos pequenos, onde a curva precisa aparecer mais */
  intensidade?: 'normal' | 'forte'
}) {
  const id = `curva-${intensidade}`
  return (
    <svg
      aria-hidden
      viewBox="0 0 400 200"
      preserveAspectRatio="none"
      className={cn(
        'pointer-events-none absolute inset-0 h-full w-full',
        intensidade === 'forte' ? 'opacity-30' : 'opacity-20',
        className,
      )}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="55%" stopColor="#9BE8FF" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#00E6BB" stopOpacity="1" />
        </linearGradient>
      </defs>
      {/* a curva principal: o dinheiro subindo */}
      <path d="M0 190 C 120 185, 210 120, 280 70 S 370 10, 400 0" fill="none"
        stroke={`url(#${id})`} strokeWidth="2.5" />
      {/* uma segunda, mais abaixo, para o traço não parecer solto */}
      <path d="M0 200 C 140 196, 230 140, 300 96 S 380 40, 400 30" fill="none"
        stroke={`url(#${id})`} strokeWidth="1.2" opacity="0.6" />
      <path d="M0 200 C 120 195, 210 130, 280 80 S 370 20, 400 10 L400 200 Z"
        fill={`url(#${id})`} opacity="0.18" />
    </svg>
  )
}
