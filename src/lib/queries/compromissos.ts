'use client'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/queries/keys'

/**
 * A agenda, do lado da leitura.
 *
 * Uma consulta só traz tudo o que a tela mostra — os pendentes e os feitos
 * recentes. A separação em atrasado / hoje / esta semana é feita no cliente,
 * porque depende de "hoje" e são dezenas de linhas, não milhares: mandar isso
 * ao banco custaria uma ida e volta por gaveta.
 */

export type Compromisso = {
  id: string
  titulo: string
  data: string
  /** nulo = do dia, sem hora marcada */
  hora: string | null
  nota: string
  concluidoEm: string | null
  clienteId: string | null
  clienteNome: string | null
}

type Linha = {
  id: string
  titulo: string
  data: string
  hora: string | null
  nota: string
  concluido_em: string | null
  cliente_id: string | null
  clientes: { nome: string } | { nome: string }[] | null
}

function daLinha(l: Linha): Compromisso {
  // o join volta objeto ou array conforme a cardinalidade que o PostgREST
  // infere; normalizar aqui evita espalhar o `Array.isArray` pela tela
  const cliente = Array.isArray(l.clientes) ? l.clientes[0] : l.clientes
  return {
    id: l.id, titulo: l.titulo, data: l.data,
    hora: l.hora, nota: l.nota, concluidoEm: l.concluido_em,
    clienteId: l.cliente_id, clienteNome: cliente?.nome ?? null,
  }
}

/**
 * Os compromissos de um intervalo de dias.
 *
 * Por intervalo, e não "os abertos": a grade de mês precisa mostrar o mês
 * inteiro, inclusive o que já foi feito — um calendário que esconde o passado
 * mente sobre onde o tempo foi. Quem quer só o que está em aberto filtra
 * depois, que é barato para dezenas de linhas.
 *
 * A janela costuma cobrir mais que a tela pede, para trocar de mês não
 * disparar uma consulta por clique.
 */
export function useCompromissos(de: string, ate: string) {
  return useQuery({
    queryKey: queryKeys.compromissos(de, ate),
    queryFn: async (): Promise<Compromisso[]> => {
      const supabase = createClient()
      const { data, error } = await supabase.from('compromissos')
        .select('id, titulo, data, hora, nota, concluido_em, cliente_id, clientes(nome)')
        .gte('data', de).lte('data', ate)
        .order('data', { ascending: true })
        .order('hora', { ascending: true, nullsFirst: true })
      if (error) throw error
      return (data as unknown as Linha[]).map(daLinha)
    },
  })
}
