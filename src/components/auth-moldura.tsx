import { Logo } from '@/components/logo'
import { CurvaMarca } from '@/components/curva-marca'

/**
 * Moldura das telas de entrada: no desktop a tela divide em duas — a marca à
 * esquerda, sobre o roxo, com a curva de crescimento; o formulário à direita,
 * sobre o claro. No celular vira uma coluna: a marca abre a tela e o
 * formulário sobe por cima dela.
 *
 * A marca é o assunto aqui. Não há produto para mostrar antes do login, e o
 * corretor está prestes a confiar o dinheiro dele a este nome — então ele
 * aparece do tamanho de quem se apresenta, símbolo em cima e palavra embaixo,
 * e não como etiqueta de canto.
 *
 * O verde não aparece aqui: ação é roxo; verde é dinheiro, e nas telas de
 * entrada ainda não há dinheiro nenhum.
 */
export function AuthMoldura({ titulo, apoio, children }: {
  titulo: React.ReactNode
  apoio: string
  children: React.ReactNode
}) {
  return (
    /* coluna que ocupa a tela no celular: sem isto o cartão do formulário
       termina onde o conteúdo termina e sobra uma faixa de fundo embaixo dele,
       que lê como página cortada no meio */
    <main className="flex min-h-dvh flex-col md:grid md:min-h-dvh md:grid-cols-2">
      {/* o pb extra no celular é o que o cartão do formulário cobre ao subir */}
      <section className="superficie-marca relative overflow-hidden px-6 pb-16 pt-14 text-white md:flex md:min-h-dvh md:items-center md:px-14 md:py-10">
        <div aria-hidden className="brilho-marca pointer-events-none absolute inset-0" />
        <CurvaMarca />

        {/* centrado no celular, alinhado à esquerda no desktop: numa coluna
            estreita o texto à esquerda embaixo de uma marca grande fica torto */}
        <div className="entra relative mx-auto w-full max-w-sm text-center md:mx-0 md:max-w-md md:text-left">
          <Logo tamanho="gigante" empilhado sobreEscuro className="[&_span]:text-white md:items-start" />
          <h1 className="mt-8 text-3xl font-bold leading-tight tracking-tight md:mt-10 md:text-5xl">
            {titulo}
          </h1>
          <p className="mt-3 text-white/75 md:mt-4 md:text-lg">{apoio}</p>
        </div>
      </section>

      {/*
        No celular o formulário sobe sobre o roxo e arredonda o topo. Antes os
        dois blocos se encostavam numa linha reta que cortava a tela ao meio, e
        a metade de baixo parecia outra página. Subindo, viram um só: a marca
        abre, o formulário continua.
      */}
      <section className="relative z-10 -mt-8 flex flex-1 justify-center rounded-t-[1.75rem] bg-background px-6 pb-10 pt-9 md:mt-0 md:flex-none md:items-center md:rounded-none md:py-12">
        <div className="entra-suave w-full max-w-md md:max-w-sm">{children}</div>
      </section>
    </main>
  )
}
