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

export async function cadastrar(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: String(formData.get('email')),
    password: String(formData.get('password')),
    options: { data: { nome: String(formData.get('nome')) } },
  })
  if (error) redirect('/cadastro?erro=' + encodeURIComponent('Não foi possível criar a conta. Verifique os dados e tente novamente.'))
  redirect('/app')
}

export async function sair() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
