import Image from 'next/image'
import { cn } from '@/lib/utils'

/**
 * Marca do Komyx: o K oficial (public/k-simbolo.png, recorte de k-logo.png)
 * dentro do tile navy — o mesmo par que vai para o ícone do aplicativo, então
 * o corretor reconhece na tela de início e dentro do app a mesma coisa.
 *
 * O tile é navy, e não branco nem transparente, porque a superfície de
 * destaque do produto virou roxa: o K roxo sobre roxo desapareceria.
 */
export function LogoSimbolo({ className, sobreEscuro = false, grande = false }: {
  className?: string
  /** sobre a aurora o tile navy vira uma mancha escura: ali ele fica translúcido */
  sobreEscuro?: boolean
  /** no painel a marca é o assunto do topo, não uma etiqueta de canto */
  grande?: boolean
}) {
  return (
    <span className={cn(
      'inline-flex shrink-0 items-center justify-center rounded-[0.5rem]',
      grande ? 'size-10 rounded-xl' : 'size-7',
      sobreEscuro ? 'bg-white/15' : 'bg-foreground',
      className,
    )}>
      <Image src="/k-simbolo.png" alt="" width={64} height={64}
        className={grande ? 'size-7' : 'size-5'} priority />
    </span>
  )
}

export function Logo({ className, mostrarNome = true, sobreEscuro = false, grande = false }: {
  className?: string
  mostrarNome?: boolean
  sobreEscuro?: boolean
  grande?: boolean
}) {
  return (
    <span className={cn('inline-flex items-center', grande ? 'gap-2.5' : 'gap-2', className)}>
      <LogoSimbolo sobreEscuro={sobreEscuro} grande={grande} />
      {mostrarNome && (
        <span className={cn('font-bold tracking-tight', grande ? 'text-2xl' : 'text-base')}>
          komyx
        </span>
      )}
    </span>
  )
}
