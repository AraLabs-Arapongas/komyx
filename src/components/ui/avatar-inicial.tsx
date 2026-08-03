import { cn } from '@/lib/utils'

/*
 * Iniciais do nome num disco colorido.
 *
 * A cor sai do próprio nome, não de um sorteio: assim ela não muda quando a
 * lista é reordenada ou filtrada, e o corretor reconhece o cliente pela mancha
 * antes de ler. Duas letras, porque uma só dá colisão demais numa carteira
 * cheia de "José" e "João".
 *
 * Nenhuma opção é verde: verde neste app é só dinheiro que o corretor recebe.
 * São tons da marca — roxo, azul, ciano — que dão vida sem disputar com o
 * número da comissão, que é o que a linha quer que se olhe.
 */
const TONS = [
  'bg-primary/12 text-primary',
  'bg-[#4E7BFF]/12 text-[#3B62D8]',
  'bg-ciano/15 text-[#0A7EA4]',
  'bg-[#8F7BFF]/15 text-[#5B45D6]',
  'bg-[#5468F0]/12 text-[#3F4FCC]',
] as const

/**
 * Soma dos códigos das letras: estável para o mesmo nome, espalhada o bastante.
 *
 * Exportada porque a agenda pinta o compromisso com a cor de quem ele é — e a
 * cor tem que ser a MESMA do avatar da pessoa nas outras telas, senão viram
 * dois códigos de cor concorrentes para a mesma equipe.
 */
export function tomDoNome(nome: string): string {
  let soma = 0
  for (let i = 0; i < nome.length; i++) soma += nome.charCodeAt(i)
  return TONS[soma % TONS.length]
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

export function AvatarInicial({ nome, className }: {
  /** null quando ainda não há cliente: a venda registrada às pressas */
  nome: string | null
  className?: string
}) {
  const base = 'flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold tracking-tight'

  /*
   * Sem cliente não tem iniciais. Tirá-las do texto "Sem cliente" daria "SC",
   * que se lê como o nome de alguém — o vazio passaria por pessoa. Um traço em
   * tom neutro diz o que é: ainda não tem dono.
   */
  if (!nome?.trim()) {
    return (
      <span aria-hidden className={cn(base, 'bg-muted font-normal text-muted-foreground', className)}>
        —
      </span>
    )
  }

  return (
    <span aria-hidden className={cn(base, tomDoNome(nome), className)}>
      {iniciais(nome)}
    </span>
  )
}
