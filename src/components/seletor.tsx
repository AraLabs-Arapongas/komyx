'use client'
import { Select as SelectPrimitive } from 'radix-ui'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export type Opcao<T extends string> = {
  valor: T
  rotulo: string
  /** Texto da pílula quando essa opção está ativa. A lista tem espaço para
   *  explicar ("Data mais próxima"); a pílula, não ("Mais próxima"). */
  rotuloCurto?: string
}

/**
 * Filtro em pílula: o menu nativo do browser é feio e destoa do resto, mas
 * uma fila de botões come a tela inteira no celular. Aqui a lista mora num
 * popover próprio e a pílula escurece quando o filtro sai do padrão, para o
 * corretor saber que está vendo um recorte sem precisar ler o rótulo.
 */
export function Seletor<T extends string>({ valor, opcoes, onMuda, padrao, className }: {
  valor: T
  opcoes: Opcao<T>[]
  onMuda: (v: T) => void
  /** valor "neutro": enquanto for esse, a pílula fica discreta */
  padrao?: T
  className?: string
}) {
  const ativo = padrao !== undefined && valor !== padrao
  const atual = opcoes.find(o => o.valor === valor)

  return (
    <SelectPrimitive.Root value={valor} onValueChange={v => onMuda(v as T)}>
      <SelectPrimitive.Trigger
        className={cn(
          'flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium outline-none transition-colors',
          'focus-visible:ring-2 focus-visible:ring-money/40',
          ativo
            ? 'bg-primary text-primary-foreground'
            : 'bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_8%)]',
          className,
        )}
      >
        <SelectPrimitive.Value>
          {atual ? atual.rotuloCurto ?? atual.rotulo : null}
        </SelectPrimitive.Value>
        <SelectPrimitive.Icon asChild>
          <ChevronDown size={14} className={cn('shrink-0', ativo ? 'opacity-70' : 'text-muted-foreground')} />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className="z-50 max-h-(--radix-select-content-available-height)
                     min-w-[var(--radix-select-trigger-width)] overflow-y-auto rounded-lg
                     bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/10
                     data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95
                     data-closed:animate-out data-closed:fade-out-0"
        >
          <SelectPrimitive.Viewport>
            {opcoes.map(o => (
              <SelectPrimitive.Item
                key={o.valor}
                value={o.valor}
                className="flex cursor-default select-none items-center justify-between gap-6 rounded-lg
                           px-3 py-2 text-sm outline-none data-highlighted:bg-secondary"
              >
                <SelectPrimitive.ItemText>{o.rotulo}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator>
                  <Check size={16} className="text-money" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
