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

/*
 * Três tamanhos, e nenhuma classe de dimensão na chamada.
 *
 * O `gigante` existe para as telas em que a marca É o conteúdo — entrada e
 * onboarding, onde não há produto ainda para mostrar e a única coisa a dizer é
 * de quem é isto aqui. Os 120px valem no celular e no desktop: encolher no
 * celular faria a marca sumir justamente onde ela é a tela inteira.
 *
 * O K ocupa 70% do tile nos três, que é a proporção do ícone do aplicativo.
 */
const TAMANHOS = {
  padrao: { tile: 'size-7 rounded-[0.5rem]', simbolo: 'size-5', nome: 'text-base', gap: 'gap-2' },
  grande: { tile: 'size-10 rounded-xl', simbolo: 'size-7', nome: 'text-2xl', gap: 'gap-2.5' },
  gigante: {
    tile: 'size-[7.5rem] rounded-[1.75rem]', simbolo: 'size-[5.25rem]',
    nome: 'text-3xl', gap: 'gap-4',
  },
} as const

export type TamanhoLogo = keyof typeof TAMANHOS

export function LogoSimbolo({ className, sobreEscuro = false, tamanho = 'padrao' }: {
  className?: string
  /** sobre a aurora o tile navy vira uma mancha escura: ali ele fica translúcido */
  sobreEscuro?: boolean
  tamanho?: TamanhoLogo
}) {
  const t = TAMANHOS[tamanho]
  return (
    <span className={cn(
      'inline-flex shrink-0 items-center justify-center',
      t.tile,
      sobreEscuro ? 'bg-white/15' : 'bg-foreground',
      className,
    )}>
      {/* 256px de origem: o `gigante` tem 120 de lado e em tela retina pede o
          dobro disso */}
      <Image src="/k-simbolo.png" alt="" width={256} height={256}
        className={t.simbolo} priority />
    </span>
  )
}

export function Logo({
  className, mostrarNome = true, sobreEscuro = false, tamanho = 'padrao', empilhado = false,
}: {
  className?: string
  mostrarNome?: boolean
  sobreEscuro?: boolean
  tamanho?: TamanhoLogo
  /**
   * Símbolo em cima, nome embaixo. É a forma das telas em que a marca abre a
   * página sozinha — em linha, um K de 120px ao lado da palavra atravessaria a
   * largura do celular.
   */
  empilhado?: boolean
}) {
  const t = TAMANHOS[tamanho]
  return (
    <span className={cn(
      'inline-flex items-center',
      empilhado ? 'flex-col' : '',
      t.gap,
      className,
    )}>
      <LogoSimbolo sobreEscuro={sobreEscuro} tamanho={tamanho} />
      {mostrarNome && (
        <span className={cn('font-bold tracking-tight', t.nome)}>komyx</span>
      )}
    </span>
  )
}
