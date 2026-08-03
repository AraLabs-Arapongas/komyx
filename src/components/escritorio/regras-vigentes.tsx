/*
 * Cliente por causa do ícone: `Secao` é client component e um ícone do Lucide
 * é uma função — passá-lo de uma página server explode em runtime, sem o
 * typecheck acusar. É a mesma pegadinha anotada no menu-perfil.
 */
'use client'
import { TrendingUp, CalendarDays, Undo2, Users } from 'lucide-react'
import { Secao } from '@/components/config-form'
import { formatBRL } from '@/lib/format'
import { ROTULOS_ESTORNO, type Faixa, type PoliticaEstorno } from '@/lib/domain/types'

/**
 * As regras do escritório, para ler — não para editar.
 *
 * Quem entra por convite não configura nada, mas precisa saber como é pago:
 * esconder o formulário e não pôr nada no lugar deixaria a pergunta "quanto eu
 * ganho por venda?" sem resposta dentro do próprio app.
 *
 * Sem componente de tabela: são três a cinco linhas de texto, e uma tabela
 * para isso quebraria no celular sem ganhar nada.
 */
export function RegrasVigentes({ faixas, diaFechamento, diaPrimeiroPagamento, politicaEstorno, faixaPorEscritorio }: {
  faixas: Faixa[]
  diaFechamento: number
  diaPrimeiroPagamento: number
  politicaEstorno: PoliticaEstorno
  faixaPorEscritorio: boolean
}) {
  return (
    <div className="space-y-3">
      <Secao titulo="Sua comissão" icone={TrendingUp}
        apoio="Calculada pelo total vendido no mês.">
        <div className="space-y-1.5 text-sm">
          {faixas.map((f, i) => (
            <p key={i} className="flex flex-wrap gap-x-1.5">
              <span className="text-muted-foreground">
                De {formatBRL(f.min)} {f.max === null ? 'para cima' : `até ${formatBRL(f.max)}`}
              </span>
              <span className="font-medium">
                {String(f.percentual).replace('.', ',')}% em {f.parcelas}x
              </span>
              {f.distribuicao?.length ? (
                <span className="text-muted-foreground">
                  ({f.distribuicao.map(p => String(p).replace('.', ',')).join('% / ')}%)
                </span>
              ) : null}
            </p>
          ))}
        </div>
        {faixaPorEscritorio && (
          <p className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
            <Users size={16} className="mt-0.5 shrink-0" />
            Sua faixa é definida pelo total que a equipe vende no mês, não só
            pelo seu. A comissão continua sendo sobre as suas vendas.
          </p>
        )}
      </Secao>

      <Secao titulo="Calendário" icone={CalendarDays}>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>Vendas entram no mês até o dia {diaFechamento}; depois disso, no mês seguinte.</p>
          <p>A primeira parcela cai no dia {diaPrimeiroPagamento} do mês seguinte.</p>
        </div>
      </Secao>

      <Secao titulo="Se o cliente desistir" icone={Undo2}>
        <div className="space-y-0.5 text-sm">
          <p className="font-medium">{ROTULOS_ESTORNO[politicaEstorno].titulo}</p>
          <p className="text-muted-foreground">{ROTULOS_ESTORNO[politicaEstorno].apoio}</p>
        </div>
      </Secao>
    </div>
  )
}
