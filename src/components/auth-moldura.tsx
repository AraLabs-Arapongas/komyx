import { Logo } from '@/components/logo'

/**
 * Moldura das telas de entrada: no desktop a tela divide em duas — a marca à
 * esquerda, sobre o roxo, com a curva de crescimento; o formulário à direita,
 * sobre o claro. No celular vira uma coluna: painel roxo compacto no topo e o
 * formulário ocupando o resto.
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
    <main className="min-h-dvh md:grid md:grid-cols-2">
      <section className="superficie-marca relative overflow-hidden px-6 py-10 text-white md:flex md:min-h-dvh md:items-center md:px-14">
        <div aria-hidden className="brilho-marca pointer-events-none absolute inset-0" />
        {/* a curva da marca, discreta sobre o roxo */}
        <svg aria-hidden viewBox="0 0 400 200" preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full opacity-20">
          <defs>
            <linearGradient id="curva-auth" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
              <stop offset="100%" stopColor="#00C2FF" stopOpacity="1" />
            </linearGradient>
          </defs>
          <path d="M0 190 C 120 185, 210 120, 280 70 S 370 10, 400 0" fill="none"
            stroke="url(#curva-auth)" strokeWidth="2.5" />
          <path d="M0 200 C 120 195, 210 130, 280 80 S 370 20, 400 10 L400 200 Z"
            fill="url(#curva-auth)" opacity="0.25" />
        </svg>

        <div className="entra relative mx-auto w-full max-w-sm md:mx-0 md:max-w-md">
          <Logo className="[&_span]:text-white" />
          <h1 className="mt-8 text-3xl font-bold leading-tight tracking-tight md:mt-10 md:text-5xl">
            {titulo}
          </h1>
          <p className="mt-3 text-white/75 md:mt-4 md:text-lg">{apoio}</p>
        </div>
      </section>

      <section className="flex justify-center bg-background px-6 pb-10 pt-8 md:items-center md:py-12">
        <div className="entra-suave w-full max-w-md md:max-w-sm">{children}</div>
      </section>
    </main>
  )
}
