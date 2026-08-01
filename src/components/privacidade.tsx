'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

const CHAVE = 'consorpro:valores-ocultos'

type Contexto = { oculto: boolean; alternar: () => void }
const PrivacidadeContext = createContext<Contexto>({ oculto: false, alternar: () => {} })

export function usePrivacidade() {
  return useContext(PrivacidadeContext)
}

export function PrivacidadeProvider({ children }: { children: React.ReactNode }) {
  // começa oculto de propósito: o corretor costuma abrir o app na rua, e um
  // valor que aparece antes da preferência ser lida já foi visto por quem
  // estava do lado. Quem prefere ver escolhe uma vez e a escolha fica salva.
  const [oculto, setOculto] = useState(true)

  useEffect(() => {
    setOculto(window.localStorage.getItem(CHAVE) !== '0')
  }, [])

  function alternar() {
    setOculto(anterior => {
      const novo = !anterior
      window.localStorage.setItem(CHAVE, novo ? '1' : '0')
      return novo
    })
  }

  return (
    <PrivacidadeContext.Provider value={{ oculto, alternar }}>
      {children}
    </PrivacidadeContext.Provider>
  )
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
