import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/logo'
import { Calculator, CalendarClock, TrendingUp } from 'lucide-react'

const beneficios = [
  {
    icon: Calculator,
    titulo: 'A comissão se calcula sozinha',
    texto: 'Registre a venda em menos de 30 segundos. Faixa, percentual e parcelas saem prontos, do jeito que seu escritório paga.',
  },
  {
    icon: CalendarClock,
    titulo: 'Você sabe quando o dinheiro cai',
    texto: 'Cada venda vira um calendário de recebimentos. Quanto falta, quanto já entrou e o que vem nos próximos meses.',
  },
  {
    icon: TrendingUp,
    titulo: 'Seu mês em dez segundos',
    texto: 'Abriu, viu. Quanto vendeu, quanto vai receber e qual faixa você alcançou — sem abrir uma aba de planilha.',
  },
]

export default function LandingPage() {
  return (
    <main>
      {/* O visitante vê o produto antes de ler sobre ele: a mesma superfície
          escura que ele encontrará todo dia no painel. */}
      <section className="bg-escuro text-white">
        <div className="mx-auto max-w-5xl px-5 pb-20 pt-6">
          <header className="flex items-center justify-between">
            <Logo className="[&_span]:text-white [&_rect:first-child]:fill-white [&_rect:not(:first-child)]:fill-[#06291F]" />
            <Button asChild variant="ghost" className="text-escuro-texto hover:bg-white/10 hover:text-white">
              <Link href="/login">Entrar</Link>
            </Button>
          </header>

          <div className="entra mx-auto max-w-2xl pt-16 text-center md:pt-24">
            <p className="text-escuro-texto">Para corretores de consórcio</p>
            <h1 className="mt-3 text-4xl font-bold leading-[1.1] tracking-tight md:text-6xl">
              Chega de calcular<br />comissão no Excel.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-escuro-texto">
              Configure uma vez como seu escritório paga. Depois, é só registrar as vendas —
              o ConsorPro diz exatamente quanto e quando você recebe.
            </p>
            <Button asChild size="lg"
              className="mt-8 h-12 bg-money-claro px-8 text-base text-[#06291F] hover:bg-money-claro/90">
              <Link href="/cadastro">Criar conta grátis</Link>
            </Button>
          </div>

          {/* amostra do produto: o número que o corretor abre o app para ver */}
          <div className="entra-suave mx-auto mt-16 max-w-sm rounded-3xl bg-white/[0.06] p-6 backdrop-blur">
            <p className="text-sm text-escuro-texto">Você receberá</p>
            <p className="mt-1 text-5xl font-bold tracking-tight tabular-nums text-money-claro">
              R$ 5.000,00
            </p>
            <p className="mt-2 text-escuro-texto">em 10 dias · 10 de setembro</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-20">
        <div className="grid gap-10 md:grid-cols-3">
          {beneficios.map(({ icon: Icon, titulo, texto }) => (
            <div key={titulo}>
              <Icon className="text-money" size={22} />
              <h2 className="mt-3 text-lg font-semibold">{titulo}</h2>
              <p className="mt-1.5 text-muted-foreground">{texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-24">
        <div className="rounded-3xl bg-escuro px-6 py-14 text-center text-white">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            Sua planilha não sabe quanto você vai receber.
          </h2>
          <p className="mx-auto mt-2 max-w-md text-escuro-texto">
            O ConsorPro sabe. E avisa no dia em que o dinheiro cai.
          </p>
          <Button asChild size="lg"
            className="mt-7 h-12 bg-money-claro px-8 text-base text-[#06291F] hover:bg-money-claro/90">
            <Link href="/cadastro">Começar agora</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        ConsorPro — gestão financeira para corretores de consórcio.
      </footer>
    </main>
  )
}
