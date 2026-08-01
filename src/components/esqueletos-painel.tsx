import { Skeleton } from '@/components/ui/skeleton'

/*
 * Esqueletos com a forma do que vem depois.
 *
 * O objetivo não é "mostrar que está carregando" — é reservar o espaço certo,
 * para o conteúdo não empurrar a tela quando chegar. Por isso cada bloco tem
 * o mesmo número de linhas e as mesmas alturas do componente real.
 */

/** O bloco escuro do topo, com saudação, valor grande e botão. */
export function EsqueletoHero() {
  return (
    <section className="-mx-4 -mt-4 space-y-4 bg-escuro px-5 pb-6 pt-5 md:mx-0 md:mt-0 md:rounded-3xl md:px-8 md:pb-7 md:pt-6">
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-4 w-28 bg-white/10" />
        <Skeleton className="h-6 w-28 rounded-full bg-white/10" />
      </div>
      <Skeleton className="h-4 w-24 bg-white/10" />
      <Skeleton className="h-10 w-52 bg-white/10 md:h-14" />
      <Skeleton className="h-4 w-40 bg-white/10" />
      <Skeleton className="h-11 w-full rounded-md bg-white/10 md:w-44" />
    </section>
  )
}

/** Os quatro números do mês, em uma coluna no celular. */
export function EsqueletoNumeros() {
  return (
    <section className="min-w-0 space-y-3">
      <Skeleton className="h-4 w-36" />
      <div className="grid gap-y-2.5 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1 py-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-28" />
          </div>
        ))}
      </div>
    </section>
  )
}

/**
 * A extração da Federal: cinco linhas, do mesmo tamanho das de verdade.
 *
 * Fica em pé até a conferência das cotas terminar, não só o resultado da
 * loteria — senão os números apareceriam primeiro e o marcador de cota
 * sorteada surgiria depois, piscando sobre um número que o corretor já
 * estava lendo.
 */
export function EsqueletoLoteria() {
  return (
    <section className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="divide-y overflow-hidden rounded-2xl bg-card">
        {Array.from({ length: 5 }).map((_, i) => (
          /* a altura acompanha a do número de verdade (text-base, e text-lg no
             desktop): com barras mais baixas o cartão encolhia 40px e a lista
             dava um salto ao chegar */
          <div key={i} className="flex items-center justify-between gap-2 px-3 py-2.5 md:px-4">
            <Skeleton className="h-4 w-5" />
            <Skeleton className="h-6 w-24 md:h-7 md:w-28" />
          </div>
        ))}
      </div>
    </section>
  )
}

/** Uma das duas listas do rodapé: um item e a linha de "ver tudo". */
export function EsqueletoLista() {
  return (
    <section className="flex min-w-0 flex-col space-y-2">
      <Skeleton className="h-4 w-32" />
      <div className="flex flex-1 flex-col divide-y overflow-hidden rounded-2xl bg-card">
        <div className="space-y-1.5 px-3 py-2.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="mt-auto flex justify-center px-3 py-2">
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </section>
  )
}
