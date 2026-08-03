'use client'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/queries/keys'

/**
 * Leituras da área do escritório.
 *
 * O painel chega pronto do banco: `painel_escritorio` agrega em SQL porque N
 * corretores de vendas somadas em JS no navegador não trafega — é a regra que
 * o resumo da agenda já segue. Aqui só se tipa e se entrega.
 */

export type LinhaCorretor = {
  corretorId: string
  nome: string
  papel: 'dono' | 'corretor'
  ativo: boolean
  nVendas: number
  totalCentavos: number
  comissaoCentavos: number
  /** nulo quando o mês não tem meta para este corretor */
  metaCentavos: number | null
}

export type LinhaAgrupada = {
  administradora?: string
  produto?: string
  nVendas: number
  totalCentavos: number
}

export type PainelEscritorio = {
  total: { nVendas: number; totalCentavos: number; comissaoCentavos: number }
  metaCasaCentavos: number | null
  porCorretor: LinhaCorretor[]
  porAdministradora: LinhaAgrupada[]
  porProduto: LinhaAgrupada[]
}

export function usePainelEscritorio(ano: number, mes: number) {
  return useQuery({
    queryKey: queryKeys.painelEscritorio(ano, mes),
    enabled: ano > 0 && mes > 0,
    queryFn: async (): Promise<PainelEscritorio> => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('painel_escritorio', { p_ano: ano, p_mes: mes })
      if (error) throw error
      return data as unknown as PainelEscritorio
    },
  })
}

export type Membro = {
  membro_id: string
  corretor_id: string
  nome: string
  papel: 'dono' | 'corretor'
  entrou_em: string
  saiu_em: string | null
}

export type Convite = {
  id: string
  email: string
  token: string
  status: 'pendente' | 'aceito' | 'revogado'
  criado_em: string
  expira_em: string
}

export function useEquipe() {
  return useQuery({
    queryKey: queryKeys.equipe,
    queryFn: async () => {
      const supabase = createClient()
      const [membros, convites, plano] = await Promise.all([
        supabase.rpc('membros_do_escritorio'),
        supabase.from('convites_escritorio')
          .select('id, email, token, status, criado_em, expira_em')
          .eq('status', 'pendente')
          .order('criado_em', { ascending: false }),
        // o tamanho contratado: a tela de equipe precisa dizer quantas vagas
        // sobraram antes de o dono digitar o e-mail e levar um erro
        supabase.from('escritorios').select('limite_corretores').maybeSingle(),
      ])
      if (membros.error) throw membros.error
      if (convites.error) throw convites.error
      return {
        membros: (membros.data ?? []) as Membro[],
        convites: (convites.data ?? []) as Convite[],
        limiteCorretores: plano.data?.limite_corretores ?? null,
      }
    },
  })
}

/* ---------------- painel do dono ---------------- */

export type MesRef = { ano: number; mes: number }

export type TotalMes = { totalCentavos: number; comissaoCentavos: number; nVendas: number }

export type CorretorDoPainel = {
  corretorId: string
  nome: string
  papel: 'dono' | 'corretor'
  ativo: boolean
  totalCentavos: number
  comissaoCentavos: number
  nVendas: number
  anteriorCentavos: number
  metaCentavos: number | null
  /** dias desde a última venda; nulo se nunca vendeu */
  diasSemVender: number | null
  mediaMensalCentavos: number
}

export type PainelDoDono = {
  mes: MesRef
  total: TotalMes
  anterior: TotalMes
  metaCasaCentavos: number | null
  /** desde quando a meta da casa vale; nula quando não há meta */
  metaCasaVigenteDe: string | null
  perdas: { nVendas: number; totalCentavos: number }
  convitesPendentes: number
  corretores: CorretorDoPainel[]
  historico: (MesRef & TotalMes)[]
  historicoPorCorretor: {
    corretorId: string
    nome: string
    serie: (MesRef & { totalCentavos: number })[]
  }[]
  previsto: (MesRef & { centavos: number })[]
  porAdministradora: { rotulo: string; nVendas: number; totalCentavos: number }[]
  porProduto: { rotulo: string; nVendas: number; totalCentavos: number }[]
  ultimasVendas: {
    nome: string; cliente: string | null; centavos: number; quando: string
  }[]
}

/* ---------------- metas, do lado do corretor ---------------- */

export type MinhasMetas = {
  escritorio: string
  /** nulas quando o escritório ainda não definiu meta para este mês */
  minhaMetaCentavos: number | null
  minhaVigenteDe: string | null
  metaCasaCentavos: number | null
  metaCasaVigenteDe: string | null
  meuTotalCentavos: number
  totalEscritorioCentavos: number
}

/**
 * As metas que o escritório definiu para mim e para a casa.
 *
 * Devolve nulo para quem não está em escritório nenhum — é assim que a tela
 * sabe não desenhar nada, sem precisar perguntar o vínculo por fora.
 */
export function useMinhasMetas(ano: number, mes: number) {
  return useQuery({
    queryKey: queryKeys.minhasMetas(ano, mes),
    enabled: ano > 0 && mes > 0,
    queryFn: async (): Promise<MinhasMetas | null> => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('minhas_metas', { p_ano: ano, p_mes: mes })
      if (error) throw error
      return (data as unknown as MinhasMetas | null) ?? null
    },
  })
}

/**
 * A tela do dono inteira numa chamada.
 *
 * Histórico de seis meses cruzado com metas e com a agenda de recebimentos da
 * equipe: nada disso se monta no navegador sem baixar as vendas de todo mundo.
 */
export function usePainelDoDono(ano: number, mes: number) {
  return useQuery({
    queryKey: queryKeys.painelDoDono(ano, mes),
    enabled: ano > 0 && mes > 0,
    queryFn: async (): Promise<PainelDoDono> => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('painel_do_dono', {
        p_ano: ano, p_mes: mes, p_meses_historico: 6,
      })
      if (error) throw error
      return data as unknown as PainelDoDono
    },
  })
}

