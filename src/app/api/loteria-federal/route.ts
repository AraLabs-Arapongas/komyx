/**
 * Resultado da Loteria Federal — a referência que os sorteios de consórcio usam
 * para contemplar. O corretor acompanha para saber se algum cliente foi sorteado.
 *
 * A Caixa não publica uma API documentada; esta é a mesma origem que o portal
 * loterias.caixa.gov.br consome. Dado de primeira mão, mas sem contrato de
 * estabilidade: se mudar ou sair do ar, a seção some do painel e nada mais quebra.
 *
 * Passa por rota nossa em vez de ir direto do navegador por dois motivos: o
 * endpoint não envia cabeçalhos de CORS, e assim a resposta fica em cache na
 * borda — a extração acontece duas vezes por semana, não faz sentido consultar
 * a Caixa a cada visita ao painel.
 */
export const dynamic = 'force-static'
export const revalidate = 3600

const FONTE = 'https://servicebus2.caixa.gov.br/portaldeloterias/api/federal'

export type ResultadoFederal = {
  concurso: number
  /** ISO, para o cliente formatar como quiser */
  data: string
  /** os cinco bilhetes premiados, do 1º ao 5º prêmio */
  bilhetes: string[]
}

/** A Caixa devolve "29/07/2026"; o resto do sistema fala ISO. */
function paraISO(dataBR: string): string {
  const [dia, mes, ano] = dataBR.split('/')
  return `${ano}-${mes}-${dia}`
}

export async function GET() {
  try {
    const resposta = await fetch(FONTE, { signal: AbortSignal.timeout(8000) })
    if (!resposta.ok) {
      console.error('[loteria-federal] a Caixa respondeu', resposta.status, resposta.statusText)
      return Response.json({ erro: 'indisponivel' }, { status: 503 })
    }

    const bruto = await resposta.json() as {
      numero?: number
      dataApuracao?: string
      listaDezenas?: string[]
    }
    if (!bruto.numero || !bruto.dataApuracao || !bruto.listaDezenas?.length) {
      return Response.json({ erro: 'formato_inesperado' }, { status: 503 })
    }

    const resultado: ResultadoFederal = {
      concurso: bruto.numero,
      data: paraISO(bruto.dataApuracao),
      bilhetes: bruto.listaDezenas,
    }
    return Response.json(resultado)
  } catch (erro) {
    console.error('[loteria-federal] não alcancei a Caixa:', erro)
    return Response.json({ erro: 'indisponivel' }, { status: 503 })
  }
}
