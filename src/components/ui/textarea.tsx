import * as React from "react"

import { cn } from "@/lib/utils"

/*
 * Irmão do Input para texto de várias linhas.
 *
 * Observação de venda não cabe numa linha — e esticar a altura de um <input>
 * só produz uma caixa alta com o texto boiando no meio, sem quebrar linha e
 * sem deixar reler o que já se escreveu.
 *
 * Altura mínima em vez de fixa: o campo cresce com o texto até onde o autor da
 * tela permitir. As demais decisões visuais vêm do Input, para os dois não
 * divergirem quando um deles mudar.
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-24 w-full min-w-0 resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
