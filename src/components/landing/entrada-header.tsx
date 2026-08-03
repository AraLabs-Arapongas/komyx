'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { AvatarInicial } from '@/components/ui/avatar-inicial'

/**
 * O canto direito do topo da landing: "Entrar" para quem chega de fora, e o
 * próprio nome para quem já tem conta aberta neste aparelho.
 *
 * Mandar um cliente para a tela de login é pedir a senha de novo para quem já
 * está conectado — e ele tem que descobrir sozinho que era só ir para /app.
 *
 * Roda no navegador de propósito. Ler o cookie no servidor tiraria a landing
 * da geração estática, e ela é a página que precisa carregar antes de todas as
 * outras. Quem não tem sessão — a maioria absoluta de quem vê esta página — vê
 * o "Entrar" já no HTML, sem esperar nada.
 */
/*
 * Três estados, e o primeiro não é "Entrar".
 *
 * Mostrar "Entrar" enquanto a sessão é conferida faz o botão piscar e virar
 * "Olá, Thiago" meio segundo depois — pior que demorar, porque quem já estava
 * conectado lê "Entrar" e conclui que caiu a sessão. Enquanto não se sabe, o
 * lugar fica reservado, do mesmo tamanho que vai ocupar, e não afirma nada.
 */
type Estado = { fase: 'conferindo' } | { fase: 'anonimo' } | { fase: 'conectado'; nome: string }

/** altura comum aos três, para o topo não pular quando a resposta chega */
const ALTURA = 'h-11 rounded-full'

export function EntradaHeader() {
  const [estado, setEstado] = useState<Estado>({ fase: 'conferindo' })

  useEffect(() => {
    let vivo = true
    ;(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!vivo) return
      if (!user) { setEstado({ fase: 'anonimo' }); return }
      const { data: perfil } = await supabase.from('profiles')
        .select('nome').eq('id', user.id).maybeSingle()
      if (!vivo) return
      setEstado({
        fase: 'conectado',
        nome: perfil?.nome?.trim() || user.email?.split('@')[0] || 'você',
      })
    })()
    return () => { vivo = false }
  }, [])

  if (estado.fase === 'conferindo') {
    return <div aria-hidden className={`${ALTURA} w-24 animate-pulse bg-white/10 sm:w-36`} />
  }

  if (estado.fase === 'anonimo') {
    return (
      /* quem já é cliente precisa achar a porta de entrada de primeira:
         fantasma sobre fundo escuro, ela quase não existia */
      <Button asChild variant="outline"
        className={`${ALTURA} entra-suave border-white/25 bg-white/10 px-6 text-white hover:bg-white/20 hover:text-white`}>
        <Link href="/login">Entrar</Link>
      </Button>
    )
  }

  const primeiroNome = estado.nome.split(' ')[0]
  return (
    /* um link só, e não avatar + botão separados: a saudação inteira leva ao
       app, que é a única coisa que alguém quer daqui estando conectado */
    <Link href="/app"
      className={`${ALTURA} entra-suave group flex items-center gap-2.5 border border-white/25
                 bg-white/10 py-1.5 pl-1.5 pr-3 text-white transition-colors hover:bg-white/20 md:pr-4`}>
      <AvatarInicial nome={estado.nome} className="size-8 bg-white/20 text-xs text-white" />
      <span className="hidden text-sm sm:block">
        Olá, <span className="font-semibold">{primeiroNome}</span>
      </span>
      <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}
