'use client'
import { useCallback, useSyncExternalStore } from 'react'
import { Eye, EyeOff } from 'lucide-react'

const CHAVE = 'komyx:valores-ocultos'

/*
 * O modo privacidade mora no aparelho, não no React.
 *
 * É estado de fora da árvore — localStorage —, então quem lê é
 * `useSyncExternalStore`: sem provider, sem efeito copiando valor para dentro
 * de um estado, e sem o piscar de renderizar visível antes de descobrir a
 * preferência. Cada componente que chama o hook lê a mesma fonte.
 */
const ouvintes = new Set<() => void>()

function avisarTodos() {
  for (const ouvinte of ouvintes) ouvinte()
}

function assinar(aoMudar: () => void) {
  ouvintes.add(aoMudar)
  // outra aba do mesmo corretor também alterna: o evento mantém as duas juntas
  window.addEventListener('storage', aoMudar)
  return () => {
    ouvintes.delete(aoMudar)
    window.removeEventListener('storage', aoMudar)
  }
}

function lerDoAparelho(): boolean {
  return window.localStorage.getItem(CHAVE) !== '0'
}

/* No servidor não há aparelho: oculto. O corretor costuma abrir o app na rua,
   e um valor que aparece antes da preferência ser lida já foi visto por quem
   estava do lado. */
function lerNoServidor(): boolean {
  return true
}

export function usePrivacidade() {
  const oculto = useSyncExternalStore(assinar, lerDoAparelho, lerNoServidor)

  const alternar = useCallback(() => {
    const novo = window.localStorage.getItem(CHAVE) === '0'
    window.localStorage.setItem(CHAVE, novo ? '1' : '0')
    avisarTodos()
  }, [])

  return { oculto, alternar }
}

export function BotaoPrivacidade({ className }: { className?: string }) {
  const { oculto, alternar } = usePrivacidade()
  return (
    <button
      type="button"
      onClick={alternar}
      aria-pressed={oculto}
      title={oculto ? 'Mostrar valores' : 'Ocultar valores'}
      className={className}
    >
      {oculto ? <EyeOff size={18} /> : <Eye size={18} />}
      <span className="sr-only">{oculto ? 'Mostrar valores' : 'Ocultar valores'}</span>
    </button>
  )
}
