'use server'
import { createClient } from '@/lib/supabase/server'

export async function atualizarPerfil(input: { nome: string; telefone: string }) {
  try {
    const nome = input.nome.trim()
    if (!nome) return { ok: false as const, erro: 'Informe seu nome.' }
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false as const, erro: 'Sessão expirada. Entre novamente.' }
    const { error } = await supabase.from('profiles')
      .update({ nome, telefone: input.telefone.trim() || null })
      .eq('id', user.id)
    if (error) return { ok: false as const, erro: 'Não foi possível salvar o perfil. Tente novamente.' }
    return { ok: true as const }
  } catch (e) {
    return { ok: false as const, erro: e instanceof Error ? e.message : 'Erro inesperado.' }
  }
}

export async function alterarSenha(novaSenha: string) {
  try {
    if (novaSenha.length < 8)
      return { ok: false as const, erro: 'A senha precisa ter pelo menos 8 caracteres.' }
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false as const, erro: 'Sessão expirada. Entre novamente.' }
    const { error } = await supabase.auth.updateUser({ password: novaSenha })
    if (error) return { ok: false as const, erro: 'Não foi possível alterar a senha. Tente novamente.' }
    return { ok: true as const }
  } catch (e) {
    return { ok: false as const, erro: e instanceof Error ? e.message : 'Erro inesperado.' }
  }
}
