'use server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { COOKIE_LEMBRAR } from '@/lib/supabase/sessao'

const UM_ANO = 60 * 60 * 24 * 365

/*
 * O teclado do celular e o autopreenchimento colam um espaço depois do e-mail,
 * e às vezes sobe a primeira letra. O Supabase recusa o espaço com "invalid
 * format" — era o cadastro que falhava "às vezes" só no telefone. Ele já
 * guarda o e-mail em minúsculas, então normalizar aqui só alinha o que a gente
 * manda com o que ele grava.
 */
function limparEmail(bruto: FormDataEntryValue | null): string {
  return String(bruto ?? '').trim().toLowerCase()
}

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
    email: limparEmail(formData.get('email')),
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
    email: limparEmail(formData.get('email')),
    password: String(formData.get('password')),
    options: { data: { nome: String(formData.get('nome')).trim() } },
  })

  if (error) {
    // A mensagem que o corretor vê é sempre genérica — dizer "esse e-mail já
    // existe" entregaria a base de usuários a quem estivesse sondando. O motivo
    // real só vai para o log do servidor.
    console.error('[cadastro] o Supabase recusou:', error.status, error.code, error.message)
    if (error.code === 'over_email_send_rate_limit') {
      voltaAoCadastro('Muitas tentativas seguidas. Espere alguns minutos e tente de novo.')
    }
    if (error.code === 'weak_password') {
      voltaAoCadastro('A senha precisa de pelo menos 6 caracteres.')
    }
    // Sem confirmar que o e-mail existe — só apontar a saída para quem já tem
    // conta e esqueceu.
    voltaAoCadastro('Não foi possível criar a conta. Se você já tem cadastro, entre pelo login.')
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
