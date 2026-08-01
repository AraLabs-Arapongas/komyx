'use client'
import { useCallback, useEffect, useState } from 'react'
import { useCotasSorteadas } from '@/lib/queries/sorteio'
import { Confete } from '@/components/confete'

const CHAVE = 'consorpro:confete-extracao'

/**
 * Solta confete quando o corretor abre o app e alguma cota dele saiu.
 *
 * Uma vez por extração, não a cada visita: a Federal sorteia duas vezes por
 * semana, e o corretor abre o app todo dia. Repetir a festa a cada abertura
 * transformaria a notícia em ruído — e ruído é o que ele já tinha na planilha.
 *
 * A marca fica no aparelho (localStorage), não no banco: é preferência de
 * quem está olhando a tela, não um fato da conta.
 */
export function ComemoraSorteio() {
  const { temSorteada, concurso } = useCotasSorteadas()
  const [soltando, setSoltando] = useState(false)

  useEffect(() => {
    if (!temSorteada || !concurso) return
    if (localStorage.getItem(CHAVE) === String(concurso)) return
    localStorage.setItem(CHAVE, String(concurso))
    // o dado chega assíncrono e a decisão depende do localStorage, que só
    // existe no navegador: não há como derivar isto durante a renderização
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSoltando(true)
  }, [temSorteada, concurso])

  const encerrar = useCallback(() => setSoltando(false), [])

  if (!soltando) return null
  return <Confete aoTerminar={encerrar} />
}
