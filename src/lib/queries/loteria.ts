'use client'
import { useQuery } from '@tanstack/react-query'

/**
 * Resultado da Loteria Federal — a referência que os sorteios de consórcio usam
 * para contemplar. O corretor acompanha para saber se algum cliente foi sorteado.
 *
 * A Caixa não publica uma API documentada; esta é a mesma origem que o portal
 * loterias.caixa.gov.br consome. Dado de primeira mão, mas sem contrato de
 * estabilidade: se mudar ou sair do ar, a seção some do painel e nada mais quebra.
 *
 * A consulta sai do navegador do corretor, não do nosso servidor. Tentamos pelo
 * servidor primeiro — era melhor, porque a resposta ficaria em cache na borda
 * para todo mundo — mas a Caixa devolve 403 para IP de datacenter. Trocar a
 * região das funções para São Paulo e mandar cabeçalhos de navegador não mudou
 * nada: a recusa é pela faixa de IP. De um IP residencial ela responde 200, e
 * o endereço manda `access-control-allow-origin: *`, então o navegador alcança.
 */
const FONTE = 'https://servicebus2.caixa.gov.br/portaldeloterias/api/federal'

export type ResultadoFederal = {
  concurso: number
  /** ISO, para o componente formatar como quiser */
  data: string
  /** os cinco bilhetes premiados, do 1º ao 5º prêmio */
  bilhetes: string[]
}

/** A Caixa devolve "29/07/2026"; o resto do sistema fala ISO. */
function paraISO(dataBR: string): string {
  const [dia, mes, ano] = dataBR.split('/')
  return `${ano}-${mes}-${dia}`
}

/**
 * O sorteio da Federal sai quarta e sábado à noite, então uma hora de validade
 * é folgada.
 *
 * `retry: false`: fonte de apoio. Se a Caixa não responder — rede corporativa
 * bloqueando, endereço fora do ar — a seção some do painel em silêncio;
 * insistir só gastaria requisição.
 */
export function useLoteriaFederal() {
  return useQuery({
    queryKey: ['loteria-federal'],
    staleTime: 60 * 60 * 1000,
    retry: false,
    queryFn: async (): Promise<ResultadoFederal> => {
      const r = await fetch(FONTE, { signal: AbortSignal.timeout(8000) })
      if (!r.ok) throw new Error('indisponivel')

      const bruto = await r.json() as {
        numero?: number
        dataApuracao?: string
        listaDezenas?: string[]
      }
      if (!bruto.numero || !bruto.dataApuracao || !bruto.listaDezenas?.length) {
        throw new Error('formato_inesperado')
      }

      return {
        concurso: bruto.numero,
        data: paraISO(bruto.dataApuracao),
        bilhetes: bruto.listaDezenas,
      }
    },
  })
}
