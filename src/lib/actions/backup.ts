'use server'
import { createClient } from '@/lib/supabase/server'

/**
 * Tudo que pertence ao corretor, pronto para virar um arquivo .json baixado
 * no cliente. Não grava nada — só lê.
 */
export async function exportarDados() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false as const, erro: 'Sessão expirada. Entre novamente.' }

    const [clientes, vendas, comissoes, recebimentos, competencias, configuracoes] = await Promise.all([
      supabase.from('clientes').select('*').eq('corretor_id', user.id),
      supabase.from('vendas').select('*').eq('corretor_id', user.id),
      supabase.from('comissoes').select('*').eq('corretor_id', user.id),
      supabase.from('recebimentos').select('*').eq('corretor_id', user.id),
      supabase.from('competencias').select('*').eq('corretor_id', user.id),
      supabase.from('config_financeira').select('*').eq('corretor_id', user.id),
    ])

    const erro = [clientes, vendas, comissoes, recebimentos, competencias, configuracoes]
      .find(r => r.error)
    if (erro) return { ok: false as const, erro: 'Não foi possível reunir seus dados. Tente novamente.' }

    return {
      ok: true as const,
      dados: {
        versao: 1,
        geradoEm: new Date().toISOString(),
        clientes: clientes.data ?? [],
        vendas: vendas.data ?? [],
        comissoes: comissoes.data ?? [],
        recebimentos: recebimentos.data ?? [],
        competencias: competencias.data ?? [],
        configuracoes: configuracoes.data ?? [],
      },
    }
  } catch (e) {
    return { ok: false as const, erro: e instanceof Error ? e.message : 'Erro inesperado.' }
  }
}
