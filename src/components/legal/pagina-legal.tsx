import Link from 'next/link'
import { ArrowLeft, TriangleAlert } from 'lucide-react'
import { Logo } from '@/components/logo'
import { VIGENCIA, faltaPreencher } from '@/lib/legal/identificacao'

/**
 * A moldura das páginas de contrato.
 *
 * Fundo claro e coluna estreita, sem aurora nem cartão: aqui ninguém veio ver
 * o produto, veio ler. O que essas páginas precisam é do que um texto longo
 * sempre precisa — medida de linha curta, hierarquia clara e nada piscando ao
 * lado.
 */
export function PaginaLegal({ titulo, apoio, children }: {
  titulo: string
  apoio: string
  children: React.ReactNode
}) {
  const pendentes = faltaPreencher()

  return (
    <main className="min-h-dvh bg-background">
      <div className="mx-auto max-w-2xl px-5 py-10 md:py-16">
        <header className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <Link href="/"><Logo /></Link>
            <Link href="/"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft size={16} /> Início
            </Link>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{titulo}</h1>
            <p className="text-muted-foreground">{apoio}</p>
            <p className="text-sm text-muted-foreground">Em vigor desde {VIGENCIA}.</p>
          </div>
        </header>

        {/*
          O aviso é para quem está construindo, não para o corretor. Ele existe
          porque uma página legal com "[CNPJ]" no meio do texto passaria
          despercebida num deploy apressado — e um contrato sem fornecedor
          identificado não vale o que promete.
        */}
        {pendentes.length > 0 && (
          <p className="mt-8 flex items-start gap-2.5 rounded-lg border border-[#B45309]/30 bg-[#B45309]/10 px-3 py-2.5 text-sm">
            <TriangleAlert size={18} className="mt-0.5 shrink-0 text-[#B45309]" />
            <span>
              <span className="font-medium">Este texto ainda não está pronto para publicar.</span>{' '}
              Falta preencher em <code className="text-xs">src/lib/legal/identificacao.ts</code>:{' '}
              {pendentes.join(', ')}.
            </span>
          </p>
        )}

        {/*
          A prosa toda estilizada aqui, uma vez: cada seção do texto é só h2/p/
          ul, e escrever classe em cada parágrafo de um documento de trinta
          parágrafos é onde a formatação começa a divergir.
        */}
        <article className="mt-10 space-y-6 leading-relaxed
                            [&_a]:font-medium [&_a]:text-primary hover:[&_a]:underline
                            [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight
                            [&_h3]:mt-6 [&_h3]:font-semibold
                            [&_li]:pl-1 [&_p]:text-foreground/90
                            [&_strong]:font-semibold
                            [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
          {children}
        </article>

        <footer className="mt-16 flex gap-4 border-t pt-6 text-sm text-muted-foreground">
          <Link href="/termos" className="hover:text-foreground">Termos de Uso</Link>
          <Link href="/privacidade" className="hover:text-foreground">Política de Privacidade</Link>
        </footer>
      </div>
    </main>
  )
}
