'use server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
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
