'use client'
import { TriangleAlert } from 'lucide-react'
import { Voltar } from '@/components/voltar'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'

/**
 * Topo das páginas internas — as que se chega a partir de outra, não pela
 * navegação de baixo.
 *
 * Existe porque as quatro páginas do perfil abriam de quatro jeitos: duas com
 * título próprio, duas escondendo o título dentro do primeiro cartão, e o
 * botão de voltar com rótulos diferentes. Quem navega entre elas via a página
 * inteira se reorganizar a cada toque.
 */
export function CabecalhoPagina({ voltarPara, titulo, apoio, aviso }: {
  voltarPara: string
  titulo: string
  /** uma linha explicando a tela, quando o título não basta */
  apoio?: string
  /**
   * Ressalva sobre o efeito do que se faz aqui. Fica num ícone ao lado do
   * título, não num bloco: é informação que se lê uma vez e depois só ocupa a
   * primeira dobra de toda visita — e nesta tela ela empurrava o formulário
   * para baixo justamente de quem já sabe o que veio mudar.
   */
  aviso?: string
}) {
  return (
    <header className="space-y-3">
      <Voltar href={voltarPara} />
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <h1 className="text-xl font-semibold">{titulo}</h1>
          {aviso && (
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" aria-label="Ver aviso sobre esta tela"
                  className="rounded-full p-1 text-[#B45309] transition-colors hover:bg-[#F59E0B]/15">
                  <TriangleAlert size={17} />
                </button>
              </PopoverTrigger>
              <PopoverContent className="max-w-[17rem] text-sm">{aviso}</PopoverContent>
            </Popover>
          )}
        </div>
        {apoio && <p className="text-sm text-muted-foreground">{apoio}</p>}
      </div>
    </header>
  )
}
