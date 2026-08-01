'use client'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { formatBRL, formatDataExtenso } from '@/lib/format'
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
    <section className="entra relative -mx-4 -mt-4 overflow-hidden bg-escuro px-5 pb-6 pt-5 text-white md:mx-0 md:mt-0 md:rounded-3xl md:px-8 md:pb-7 md:pt-6">
      {/* curva de crescimento: a assinatura visual do produto, discreta */}
      <svg
        aria-hidden
        viewBox="0 0 400 200"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.13]"
      >
        <defs>
          <linearGradient id="brilho" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#3DDC97" stopOpacity="0" />
            <stop offset="100%" stopColor="#3DDC97" stopOpacity="1" />
          </linearGradient>
        </defs>
        <path d="M0 190 C 120 185, 210 120, 280 70 S 370 10, 400 0" fill="none"
          stroke="url(#brilho)" strokeWidth="3" />
        <path d="M0 200 C 120 195, 210 130, 280 80 S 370 20, 400 10 L400 200 Z"
          fill="url(#brilho)" opacity="0.25" />
      </svg>

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-escuro-texto">
            Olá, {primeiroNome} 👋
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

        {pagamento ? (
          <div className="mt-4">
            <p className="text-escuro-texto">
              {pagamento.jaCaiu ? 'Você recebeu' : 'Você receberá'}
            </p>
            <p className="mt-0.5 font-bold tracking-tight tabular-nums text-money-claro
                          text-[2.5rem] leading-[1.05] md:text-[3.5rem]">
              {oculto
                ? <>R$ <span className="align-middle text-[0.45em] tracking-[0.2em]">●●●●</span></>
                : formatBRL(pagamento.totalCentavos)}
            </p>
            <p className="mt-1.5 text-sm text-escuro-texto">
              {pagamento.jaCaiu
                ? `em ${formatDataExtenso(pagamento.data)}`
                : <>{quandoCai(pagamento.data, hoje)}<span className="text-white/40"> · {formatDataExtenso(pagamento.data)}</span></>}
            </p>
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-xl font-semibold md:text-2xl">Nada em {mesLabel}</p>
            <p className="mt-1 text-sm text-escuro-texto">
              Nenhuma parcela cai neste mês. Use as setas para ver outro mês.
            </p>
          </div>
        )}

        <div className="mt-5 flex items-center gap-2">
          <Button asChild size="lg"
            className="flex-1 bg-money-claro text-[#06291F] hover:bg-money-claro/90 md:flex-none">
            <Link href="/app/vendas/nova"><Plus size={18} /> Nova venda</Link>
          </Button>
          {foraDoAtual && (
            <Button variant="ghost" size="lg" onClick={onHoje}
              className="text-escuro-texto hover:bg-white/10 hover:text-white">
              Voltar para hoje
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}
