'use server'
import { createClient } from '@/lib/supabase/server'
import { cookies, headers } from 'next/headers'
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

/*
 * Para onde ir depois de entrar. O padrão é /app; um `volta` só é aceito se
 * for caminho interno — começando com uma barra e não com duas, porque
 * "//outro-site.com" é URL absoluta para o navegador e viraria open redirect
 * num formulário de senha.
 */
function destinoAposEntrar(formData: FormData): string {
  const volta = String(formData.get('volta') ?? '')
  if (volta.startsWith('/') && !volta.startsWith('//')) return volta
  return '/app'
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
  redirect(destinoAposEntrar(formData))
}

function voltaAoCadastro(mensagem: string, volta?: string): never {
  const destino = '/cadastro?erro=' + encodeURIComponent(mensagem)
  // o erro não pode engolir o destino: quem errou a senha vindo de um convite
  // ainda precisa cair no convite depois de acertar
  redirect(volta ? `${destino}&volta=${encodeURIComponent(volta)}` : destino)
}

/*
 * O log da função na Vercel é ao vivo e some, então sem isto diagnosticar uma
 * falha de cadastro exige o corretor reproduzindo na hora. Grava e segue: se a
 * escrita falhar, o cadastro não pode falhar junto.
 */
async function registrarTentativa(
  supabase: Awaited<ReturnType<typeof createClient>>,
  linha: { email: string; ok: boolean; erro_codigo?: string; erro_status?: number },
) {
  try {
    const aparelho = (await headers()).get('user-agent')
    await supabase.from('tentativas_cadastro').insert({ ...linha, aparelho })
  } catch (falha) {
    console.error('[cadastro] não registrei a tentativa:', falha)
  }
}

export async function cadastrar(formData: FormData) {
  const supabase = await createClient()
  const email = limparEmail(formData.get('email'))
  const volta = String(formData.get('volta') ?? '') || undefined
  const { data, error } = await supabase.auth.signUp({
    email,
    password: String(formData.get('password')),
    options: { data: { nome: String(formData.get('nome')).trim() } },
  })

  await registrarTentativa(supabase, {
    email,
    ok: !error,
    erro_codigo: error?.code,
    erro_status: error?.status,
  })

  if (error) {
    // A mensagem que o corretor vê é sempre genérica — dizer "esse e-mail já
    // existe" entregaria a base de usuários a quem estivesse sondando. O motivo
    // real só vai para o log do servidor.
    console.error('[cadastro] o Supabase recusou:', error.status, error.code, error.message)
    if (error.code === 'over_email_send_rate_limit') {
      voltaAoCadastro('Muitas tentativas seguidas. Espere alguns minutos e tente de novo.', volta)
    }
    if (error.code === 'weak_password') {
      voltaAoCadastro('A senha precisa de pelo menos 6 caracteres.', volta)
    }
    // Sem confirmar que o e-mail existe — só apontar a saída para quem já tem
    // conta e esqueceu.
    voltaAoCadastro('Não foi possível criar a conta. Se você já tem cadastro, entre pelo login.', volta)
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

  redirect(destinoAposEntrar(formData))
}

export async function sair() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
