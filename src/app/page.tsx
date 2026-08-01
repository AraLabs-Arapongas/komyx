import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Calculator, CalendarClock, TrendingUp } from 'lucide-react'

const beneficios = [
  { icon: Calculator, titulo: 'Comissão calculada na hora',
    texto: 'Registre a venda em menos de 30 segundos. Percentual, faixa e parcelas calculados automaticamente, do jeito que seu escritório paga.' },
  { icon: CalendarClock, titulo: 'Saiba quando o dinheiro entra',
    texto: 'Cronograma de recebimentos gerado automaticamente. Quanto falta, quanto já entrou e o que vem nos próximos meses.' },
  { icon: TrendingUp, titulo: 'Seu mês em dez segundos',
    texto: 'Abra o app e veja quanto vendeu, quanto vai receber e sua faixa atual. Sem fórmulas, sem abas, sem Excel.' },
]

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-4xl px-4">
      <header className="flex items-center justify-between py-5">
        <span className="text-lg font-bold">ConsorPro</span>
        <Button asChild variant="outline"><Link href="/login">Entrar</Link></Button>
      </header>
      <section className="py-16 text-center">
        <h1 className="mx-auto max-w-2xl text-4xl font-bold leading-tight">
          Chega de planilha para controlar suas comissões de consórcio
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          Configure uma vez como seu escritório paga. Depois, apenas registre suas vendas —
          o ConsorPro calcula comissão, parcelas e mostra exatamente quanto e quando você vai receber.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/cadastro">Criar conta grátis</Link>
        </Button>
      </section>
      <section className="grid gap-4 pb-20 md:grid-cols-3">
        {beneficios.map(({ icon: Icon, titulo, texto }) => (
          <div key={titulo} className="rounded-[10px] border bg-card p-5">
            <Icon className="mb-3 text-primary" size={24} />
            <h2 className="font-semibold">{titulo}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{texto}</p>
          </div>
        ))}
      </section>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        ConsorPro — gestão financeira para corretores de consórcio.
      </footer>
    </main>
  )
}
