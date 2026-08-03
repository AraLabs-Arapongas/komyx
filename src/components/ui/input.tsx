import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/*
 * A escala que veio do shadcn é de desktop: o campo nascia com 32px de altura,
 * abaixo do mínimo de alvo de toque. Como o Komyx se usa com o polegar, todo
 * formulário corrigia isso escrevendo `h-12` na chamada — e o que se esquecia
 * de escrever saía menor que os vizinhos.
 *
 * Agora o tamanho é decisão do componente: `toque` é o padrão, e `denso` fica
 * para o caso raro em que o campo não é o assunto da tela.
 */
const inputVariants = cva(
  "w-full min-w-0 rounded-lg border border-input bg-transparent transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
  {
    variants: {
      tamanho: {
        // 16px de texto também evita o zoom automático do Safari no iPhone
        toque: "h-12 px-3 py-2 text-base",
        denso: "h-8 px-2.5 py-1 text-base md:text-sm",
        /*
         * Sem moldura, para o campo que JÁ está dentro de uma. É o caso da
         * busca: a caixa é o painel inteiro, e uma borda em volta do campo
         * desenharia uma segunda caixa dentro da primeira.
         *
         * A altura é maior que a do `toque` porque aqui o campo é a tela toda,
         * não uma linha de formulário — e era exatamente isso que faltava
         * quando a busca parecia apertada.
         */
        nu: "h-14 border-transparent bg-transparent px-0 text-base focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent",
      },
    },
    defaultVariants: { tamanho: "toque" },
  }
)

function Input({ className, type, tamanho, ...props }: React.ComponentProps<"input"> &
  VariantProps<typeof inputVariants>) {
  return (
    <input
      type={type}
      data-slot="input"
      data-tamanho={tamanho ?? "toque"}
      className={cn(inputVariants({ tamanho, className }))}
      {...props}
    />
  )
}

export { Input, inputVariants }
