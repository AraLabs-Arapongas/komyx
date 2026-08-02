import { Voltar } from '@/components/voltar'

/**
 * Topo das páginas internas — as que se chega a partir de outra, não pela
 * navegação de baixo.
 *
 * Existe porque as quatro páginas do perfil abriam de quatro jeitos: duas com
 * título próprio, duas escondendo o título dentro do primeiro cartão, e o
 * botão de voltar com rótulos diferentes. Quem navega entre elas via a página
 * inteira se reorganizar a cada toque.
 */
export function CabecalhoPagina({ voltarPara, titulo, apoio }: {
  voltarPara: string
  titulo: string
  /** uma linha explicando a tela, quando o título não basta */
  apoio?: string
}) {
  return (
    <header className="space-y-3">
      <Voltar href={voltarPara} />
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">{titulo}</h1>
        {apoio && <p className="text-sm text-muted-foreground">{apoio}</p>}
      </div>
    </header>
  )
}
