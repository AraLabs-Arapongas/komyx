'use server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { COOKIE_LEMBRAR } from '@/lib/supabase/sessao'

const UM_ANO = 60 * 60 * 24 * 365

export async function login(formData: FormData) {
  const lembrar = formData.get('lembrar') === 'on'
  // gravado antes do login para que os cookies da sessão já nasçam com a
  // validade escolhida
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_LEMBRAR, lembrar ? '1' : '0', {
    httpOnly: true, sameSite: 'lax', path: '/',
    secure: process.env.NODE_ENV === 'production',
    ...(lembrar ? { maxAge: UM_ANO } : {}),
  })

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get('email')),
    password: String(formData.get('password')),
  })
  if (error) redirect('/login?erro=' + encodeURIComponent('E-mail ou senha incorretos.'))
  redirect('/app')
}

function voltaAoCadastro(mensagem: string): never {
  redirect('/cadastro?erro=' + encodeURIComponent(mensagem))
}

export async function cadastrar(formData: FormData) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get('email')),
    password: String(formData.get('password')),
    options: { data: { nome: String(formData.get('nome')) } },
  })

  if (error) {
    // A mensagem que o corretor vê é sempre genérica — dizer "esse e-mail já
    // existe" entregaria a base de usuários a quem estivesse sondando. O motivo
    // real só vai para o log do servidor.
    console.error('[cadastro] o Supabase recusou:', error.status, error.code, error.message)
    if (error.code === 'over_email_send_rate_limit') {
      voltaAoCadastro('Muitas tentativas seguidas. Espere alguns minutos e tente de novo.')
    }
    voltaAoCadastro('Não foi possível criar a conta. Verifique os dados e tente novamente.')
  }

  /*
   * Com "Confirm email" ligado no projeto, o signUp devolve o usuário mas
   * nenhuma sessão — mandar para /app aqui faria o proxy jogar de volta no
   * login, e o corretor veria a conta "não criada" sem entender por quê.
   */
  if (!data.session) {
    redirect('/cadastro?aviso=' + encodeURIComponent(
      'Conta criada. Confirme o e-mail que enviamos para poder entrar.'))
  }

  redirect('/app')
}

export async function sair() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
