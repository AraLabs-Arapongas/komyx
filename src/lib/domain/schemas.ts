import { z } from 'zod'
import { formatBRL } from '@/lib/format'

export const faixaSchema = z.object({
  min: z.number().int().min(0, 'O valor inicial não pode ser negativo.'),
  max: z.number().int().positive().nullable(),
  percentual: z.number()
    .positive({ message: 'O percentual deve ser maior que zero.' })
    .max(100, { message: 'O percentual não pode passar de 100%.' }),
  parcelas: z.number().int().positive({ message: 'O número de parcelas deve ser maior que zero.' }),
  /*
   * Quanto cai em cada parcela. Ausente ou nulo = divide igual, que é o que as
   * configurações anteriores a esta opção significam.
   */
  distribuicao: z.array(z.number().min(0)).nullable().optional(),
}).superRefine((f, ctx) => {
  if (!f.distribuicao) return
  if (f.distribuicao.length !== f.parcelas) {
    ctx.addIssue({ code: 'custom', path: ['distribuicao'],
      message: 'Informe a fatia de cada parcela.' })
    return
  }
  /*
   * As fatias somam a COMISSÃO da faixa, não 100.
   *
   * São pontos da carta, do jeito que o escritório fala: 3% em três vezes é
   * 1, 1 e 1. Somar 100 obrigava a converter para fração da comissão — e um
   * corretor que digitasse "1, 1, 1" numa faixa de 3% via a tela reclamar que
   * faltavam 97.
   */
  const soma = Math.round(f.distribuicao.reduce((s, p) => s + p, 0) * 100) / 100
  const alvo = Math.round(f.percentual * 100) / 100
  if (soma !== alvo) {
    ctx.addIssue({ code: 'custom', path: ['distribuicao'],
      message: `As parcelas somam ${soma.toLocaleString('pt-BR')}%. Precisa dar ${alvo.toLocaleString('pt-BR')}%, que é a comissão desta faixa.` })
  }
})

export const configFinanceiraSchema = z.object({
  nomePolitica: z.string().min(1, 'Dê um nome à política.'),
  faixas: z.array(faixaSchema).min(1, 'Cadastre pelo menos uma faixa.'),
  diaFechamento: z.number().int().min(1, 'O dia deve ser entre 1 e 31.').max(31, 'O dia deve ser entre 1 e 31.'),
  diaPrimeiroPagamento: z.number().int().min(1, 'O dia deve ser entre 1 e 31.').max(31, 'O dia deve ser entre 1 e 31.'),
  politicaEstorno: z.enum(['perguntar', 'tudo', 'proximas']).default('perguntar'),
}).superRefine((cfg, ctx) => {
  // ordena por valor inicial para checar a sequência, mas os erros apontam
  // para o índice ORIGINAL de cada faixa em cfg.faixas — é o índice que o
  // formulário usa para saber embaixo de qual campo mostrar a mensagem
  const ordenadas = [...cfg.faixas].sort((a, b) => a.min - b.min)
  const indiceOriginal = (faixa: (typeof cfg.faixas)[number]) => cfg.faixas.indexOf(faixa)

  if (ordenadas.length > 0 && ordenadas[0].min !== 0)
    ctx.addIssue({ code: 'custom', path: ['faixas', indiceOriginal(ordenadas[0])], message: 'A primeira faixa deve começar em R$ 0.' })

  for (let i = 0; i < ordenadas.length; i++) {
    const f = ordenadas[i]
    const idx = indiceOriginal(f)
    if (f.max !== null && f.max <= f.min)
      ctx.addIssue({ code: 'custom', path: ['faixas', idx, 'max'], message: `O valor final precisa ser maior que ${formatBRL(f.min)}.` })
    /*
     * A última faixa precisa ser aberta, senão a política deixa de responder o
     * que acontece acima do teto dela — e vender mais cairia num vazio.
     */
    if (f.max !== null && i === ordenadas.length - 1)
      ctx.addIssue({ code: 'custom', path: ['faixas', idx, 'max'], message: 'A última faixa não pode ter teto: é ela que vale daqui para cima.' })
    if (f.max === null && i !== ordenadas.length - 1)
      // a mensagem diz o que fazer, não a regra violada: quem lê está com o
      // campo vazio na frente e precisa saber que é ele que falta
      ctx.addIssue({ code: 'custom', path: ['faixas', idx, 'max'], message: 'Informe até quanto vai esta faixa.' })
    if (i > 0) {
      const ant = ordenadas[i - 1]
      if (ant.max === null || f.min !== ant.max + 1)
        ctx.addIssue({ code: 'custom', path: ['faixas', idx, 'max'], message: 'As faixas não podem se sobrepor nem deixar intervalos vazios.' })
    }
  }
})

export const clienteFormSchema = z.object({
  nome: z.string().min(1, 'Informe o nome do cliente.'),
  telefone: z.string().optional().default(''),
  documento: z.string().optional().default(''),
  observacoes: z.string().optional().default(''),
})

export const vendaFormSchema = z.object({
  // sem cliente é venda registrada na pressa, para completar depois — ver a
  // migration 0013
  clienteId: z.string().uuid('Cliente inválido.').nullable(),
  valorCartaCentavos: z.number().int().positive('Informe o valor da carta.'),
  administradora: z.string().min(1, 'Informe a administradora.'),
  grupo: z.string().min(1, 'Informe o grupo.'),
  cota: z.string().min(1, 'Informe a cota.'),
  dataVenda: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.'),
  observacoes: z.string().optional().default(''),
})

export type ConfigFinanceiraForm = z.infer<typeof configFinanceiraSchema>
export type VendaForm = z.infer<typeof vendaFormSchema>
export type ClienteForm = z.infer<typeof clienteFormSchema>
