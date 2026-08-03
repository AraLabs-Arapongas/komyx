import { formatBRL } from '@/lib/format'
import { ROTULOS_ESTORNO, type PoliticaEstorno } from '@/lib/domain/types'
import { cn } from '@/lib/utils'

/** O que a tela de políticas conhece de uma política — sem o `min` das faixas. */
type Inicial = {
  faixas: { max: number | null; percentual: number; parcelas: number; distribuicao?: number[] | null }[]
  diaFechamento: number
  diaPrimeiroPagamento: number
  politicaEstorno: PoliticaEstorno
}

/**
 * A política em três linhas, para ler sem abrir.
 *
 * A lista de políticas dizia só "Definida" e "Política específica": para saber
 * o que estava definido era preciso entrar no formulário de quatro passos — e
 * quem entra num formulário para conferir acaba salvando sem querer. Pior:
 * comparar a regra de um corretor com a geral exigia abrir as duas, uma de
 * cada vez, de memória.
 *
 * O `min` não vem do banco nesta tela: ele se acumula do teto da faixa
 * anterior, exatamente como o formulário faz ao montar o payload.
 */
export function ResumoPolitica({ inicial, className }: { inicial: Inicial; className?: string }) {
  // reduce, e não uma variável reatribuída: mutação durante o render é o tipo
  // de coisa que só quebra quando o React resolve renderizar duas vezes
  const { itens: faixas } = inicial.faixas.reduce<{
    acumulado: number
    itens: { min: number; max: number | null; percentual: number; parcelas: number; distribuicao?: number[] | null }[]
  }>((estado, f, i) => {
    const ultima = i === inicial.faixas.length - 1
    const max = ultima ? null : f.max
    return {
      acumulado: max !== null ? max + 1 : estado.acumulado,
      itens: [...estado.itens, { ...f, min: estado.acumulado, max }],
    }
  }, { acumulado: 0, itens: [] })

  return (
    <div className={cn('space-y-1 text-xs text-muted-foreground', className)}>
      {faixas.map((f, i) => (
        <p key={i}>
          De {formatBRL(f.min)} {f.max === null ? 'para cima' : `até ${formatBRL(f.max)}`}
          {' — '}
          <span className="font-medium text-foreground">
            {String(f.percentual).replace('.', ',')}% em {f.parcelas}x
          </span>
          {/* as fatias só aparecem quando não são iguais: repetir "1 / 1 / 1"
              logo depois de "3% em 3x" não acrescenta nada */}
          {f.distribuicao?.length
            ? ` · ${f.distribuicao.map(p => String(p).replace('.', ',')).join(' / ')}`
            : null}
        </p>
      ))}
      <p>
        Fecha dia {inicial.diaFechamento} · paga dia {inicial.diaPrimeiroPagamento} ·{' '}
        {ROTULOS_ESTORNO[inicial.politicaEstorno].titulo.toLowerCase()}
      </p>
    </div>
  )
}
