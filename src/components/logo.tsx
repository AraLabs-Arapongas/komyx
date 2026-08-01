import { cn } from '@/lib/utils'

/**
 * Marca do Komyx: o K em roxo (marca) com a perna em ciano (acento), sobre um
 * tile navy. O verde nunca aparece aqui — na interface ele significa
 * dinheiro, e só.
 *
 * Versão vetorial simplificada da marca. A arte final (K com volume) vive em
 * public/k-logo.png e é a fonte dos ícones: favicon e apple-icon em src/app/
 * e os PNGs do PWA em public/, todos gerados pelo compositor Swift
 * (scratchpad da sessão de rebrand — K sobre tile navy #0B132B).
 */
export function LogoSimbolo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn('size-6', className)}>
      <defs>
        <linearGradient id="k-roxo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8F7BFF" />
          <stop offset="100%" stopColor="#6C5CE7" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="6" className="fill-foreground" />
      <path d="M8.3 6.6v10.8" fill="none" stroke="url(#k-roxo)" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M15.8 6.8l-5.9 5.2" fill="none" stroke="url(#k-roxo)" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M10.6 13.2l5.2 4.2" fill="none" stroke="#00C2FF" strokeWidth="3.4" strokeLinecap="round" />
    </svg>
  )
}

export function Logo({ className, mostrarNome = true }: {
  className?: string
  mostrarNome?: boolean
}) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoSimbolo />
      {mostrarNome && (
        <span className="text-base font-bold tracking-tight">komyx</span>
      )}
    </span>
  )
}
