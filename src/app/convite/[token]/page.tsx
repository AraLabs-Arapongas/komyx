import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/logo'
import { CurvaMarca } from '@/components/curva-marca'
import { Button } from '@/components/ui/button'
import { BotaoAceitarConvite } from '@/components/aceitar-convite'

/**
 * A porta de entrada de quem foi convidado para um escritório.
 *
 * É pública de propósito: o link chega pelo WhatsApp e a pessoa pode nem ter
 * conta ainda. A página mostra quem está convidando ANTES de pedir qualquer
 * coisa — ninguém cria conta para descobrir do que se trata — e o token só
 * revela o nome do escritório, nunca o e-mail do convidado.
 *
 * Quem não tem sessão vai para o login/cadastro com `volta` apontando para cá:
 * depois de entrar, cai neste mesmo convite em vez de ter que reabrir o link.
 */
export default async function ConvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()

  const [{ data: convite }, { data: { user } }] = await Promise.all([
    supabase.rpc('ver_convite', { p_token: token }),
    supabase.auth.getUser(),
  ])

  const info = convite as { escritorio: string; status: string; valido: boolean } | null

  return (
    <main className="superficie-marca relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10 text-white">
      <div aria-hidden className="brilho-marca pointer-events-none absolute inset-0" />
      <CurvaMarca />

      <div className="entra relative w-full max-w-md rounded-2xl border border-white/20 bg-white/10 p-8 text-center backdrop-blur-xl">
        <Logo tamanho="gigante" empilhado sobreEscuro className="[&_span]:text-white" />

        {!info || !info.valido ? (
          <>
            {/* expirado, revogado ou token inventado: a mesma frase para os
                três — dizer qual foi entregaria o estado do convite a quem
                está chutando tokens */}
            <h1 className="mt-8 text-2xl font-bold tracking-tight">
              Este convite não vale mais
            </h1>
            <p className="mt-3 text-escuro-texto">
              Peça um novo link para o seu escritório.
            </p>
            <Button asChild variant="outline" size="toque"
              className="mt-8 w-full border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white">
              <Link href="/">Conhecer o Komyx</Link>
            </Button>
          </>
        ) : (
          <>
            <h1 className="mt-8 text-2xl font-bold tracking-tight">
              {info.escritorio} convidou você
            </h1>
            <p className="mt-3 text-escuro-texto">
              Entre para a equipe e registre suas vendas no Komyx — o escritório
              cuida da assinatura.
            </p>

            {user ? (
              <BotaoAceitarConvite token={token} escritorio={info.escritorio} />
            ) : (
              <div className="mt-8 space-y-3">
                <Button asChild size="toque"
                  className="w-full bg-money-claro text-[#0B132B] hover:bg-money-claro/90">
                  <Link href={`/cadastro?volta=${encodeURIComponent(`/convite/${token}`)}`}>
                    Criar minha conta
                  </Link>
                </Button>
                <Button asChild variant="outline" size="toque"
                  className="w-full border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                  <Link href={`/login?volta=${encodeURIComponent(`/convite/${token}`)}`}>
                    Já tenho conta
                  </Link>
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
