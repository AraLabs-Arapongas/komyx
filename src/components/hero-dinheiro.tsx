'use client'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { formatDataExtenso } from '@/lib/format'
import { NumeroAnimado } from '@/components/numero-animado'
import { CurvaMarca } from '@/components/curva-marca'
import { usePrivacidade } from '@/components/privacidade'
import { Button } from '@/components/ui/button'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function diasAte(iso: string, hoje: string): number {
  const [a1, m1, d1] = iso.split('-').map(Number)
  const [a2, m2, d2] = hoje.split('-').map(Number)
  const ms = Date.UTC(a1, m1 - 1, d1) - Date.UTC(a2, m2 - 1, d2)
  return Math.round(ms / 86_400_000)
}

/** "em 10 dias", "amanhã", "hoje" — o corretor pensa em quanto falta, não em data. */
function quandoCai(iso: string, hoje: string): string {
  const dias = diasAte(iso, hoje)
  if (dias <= 0) return 'hoje'
  if (dias === 1) return 'amanhã'
  if (dias <= 45) return `em ${dias} dias`
  return formatDataExtenso(iso)
}

/**
 * A resposta que faz o corretor abrir o app: quanto e quando.
 *
 * Fica sobre a única superfície escura do produto — o dinheiro dele não
 * divide atenção com mais nada, e é isso que separa esta tela de um relatório.
 */
export function HeroDinheiro({ nome, competencia, pagamento, hoje, foraDoAtual, onMes, onHoje }: {
  nome: string
  competencia: { ano: number; mes: number }
  pagamento: { data: string; totalCentavos: number; quantidade: number; jaCaiu: boolean } | null
  hoje: string
  foraDoAtual: boolean
  onMes: (direcao: -1 | 1) => void
  onHoje: () => void
}) {
  const { oculto } = usePrivacidade()
  const primeiroNome = nome.trim().split(' ')[0]
  const mesLabel = `${MESES[competencia.mes - 1]} de ${competencia.ano}`

  // sangra para fora do respiro da página: no celular o bloco escuro encosta
  // na barra de cima, sem faixa clara entre os dois
  return (
    /* sobe por trás do cabeçalho, que no painel é transparente: a aurora
       começa no topo da tela em vez de depois de uma faixa branca. O respiro
       de cima compensa o que a barra ocupa por cima dela. */
    <section className="entra superficie-marca relative -mx-4 -mt-[calc(var(--altura-cabecalho)+1rem)] overflow-hidden px-5 pb-6 pt-[calc(var(--altura-cabecalho)+1.25rem)] text-white md:mx-0 md:mt-0 md:rounded-lg md:px-8 md:pb-7 md:pt-6">
      {/* mesma luz da landing: o painel do corretor e a página pública são a
          mesma marca */}
      <div aria-hidden className="brilho-marca pointer-events-none absolute inset-0" />
      <CurvaMarca />

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-escuro-texto">
            Olá, <span className="font-semibold text-white">{primeiroNome}</span> 👋
          </p>
          <div className="flex items-center gap-0.5 rounded-full bg-white/10 px-1 py-0.5 text-xs">
            <button onClick={() => onMes(-1)} aria-label="Competência anterior"
              className="rounded-full p-1 hover:bg-white/10">
              <ChevronLeft size={16} />
            </button>
            <span className="px-1 font-medium">{MESES[competencia.mes - 1]}</span>
            <button onClick={() => onMes(1)} aria-label="Próxima competência"
              className="rounded-full p-1 hover:bg-white/10">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* altura reservada para o maior dos dois estados: sem isso o bloco
            escuro encolhe 22px nos meses sem parcela, e trocar de mês faz a
            tela inteira pular */}
        <div className="mt-4 min-h-24 md:min-h-28">
        {pagamento ? (
          <div>
            <p className="text-escuro-texto">
              {pagamento.jaCaiu ? 'Você recebeu' : 'Você receberá'}
            </p>
            <p className="mt-0.5 font-bold tracking-tight tabular-nums text-money-claro
                          text-[2.5rem] leading-[1.05] md:text-[3.5rem]">
              {oculto
                ? <>R$ <span className="align-middle text-[0.45em] tracking-[0.2em]">●●●●</span></>
                /* o valor sobe até o total ao abrir e ao trocar de mês — o
                   cálculo acontecendo na frente do corretor */
                : <NumeroAnimado ateCentavos={pagamento.totalCentavos} duracaoMs={900} />}
            </p>
            <p className="mt-1.5 text-sm text-escuro-texto">
              {pagamento.jaCaiu
                ? `em ${formatDataExtenso(pagamento.data)}`
                : <>{quandoCai(pagamento.data, hoje)}<span className="text-white/40"> · {formatDataExtenso(pagamento.data)}</span></>}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-xl font-semibold md:text-2xl">Nada em {mesLabel}</p>
            <p className="mt-1 text-sm text-escuro-texto">
              Nenhuma parcela cai neste mês. Use as setas para ver outro mês.
            </p>
          </div>
        )}
        </div>

        <div className="mt-5 flex items-center gap-2">
          <Button asChild size="toque"
            className="flex-1 bg-money-claro text-[#0B132B] hover:bg-money-claro/90 md:flex-none">
            <Link href="/app/vendas/nova"><Plus size={18} /> Nova venda</Link>
          </Button>
          {foraDoAtual && (
            <Button variant="ghost" size="toque" onClick={onHoje}
              className="text-escuro-texto hover:bg-white/10 hover:text-white">
              Voltar para hoje
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}
