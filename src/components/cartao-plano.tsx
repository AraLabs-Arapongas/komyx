import { Check } from 'lucide-react'
import { CurvaMarca } from '@/components/curva-marca'
import { PLANO, INCLUSO } from '@/lib/assinatura/plano'
import { cn } from '@/lib/utils'

/**
 * O plano, na superfície da marca.
 *
 * É o mesmo cartão da landing, agora dentro do app — quem chega ao fim do
 * teste reencontra a caixa que já viu antes de se cadastrar, com o mesmo preço
 * e a mesma lista. Preço que muda de cara entre a página que convenceu e a
 * tela que cobra é preço em que não se confia.
 *
 * A ação vem de fora: no app ela abre o checkout, na landing ela leva ao
 * cadastro, e nenhum dos dois é problema do cartão.
 */
export function CartaoPlano({ acao, rodape, compacto, className }: {
  acao?: React.ReactNode
  /** linha pequena embaixo do botão — "cancele quando quiser" e afins */
  rodape?: React.ReactNode
  /** sem a lista de itens, para quando ela já foi lida na mesma tela */
  compacto?: boolean
  className?: string
}) {
  return (
    <div className={cn('superficie-marca relative overflow-hidden rounded-2xl p-1.5', className)}>
      <div className="relative overflow-hidden rounded-[calc(1rem-0.375rem)] border border-white/20
                      bg-white/10 px-5 py-8 text-white backdrop-blur-xl">
        <CurvaMarca intensidade="forte" />
        <div className="relative text-center">
          <p className="text-sm text-escuro-texto">{PLANO.nome}</p>
          <p className="mt-2 flex items-baseline justify-center gap-1">
            <span className="text-lg">{PLANO.moeda}</span>
            <span className="text-5xl font-bold tracking-tight">{PLANO.valor}</span>
            <span className="text-lg text-escuro-texto">{PLANO.periodo}</span>
          </p>

          {!compacto && (
            <ul className="mt-7 space-y-3 text-left text-sm">
              {INCLUSO.map(item => (
                <li key={item} className="flex items-start gap-2.5">
                  <Check size={18} className="mt-0.5 shrink-0 text-money-claro" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}

          {acao && <div className="mt-7">{acao}</div>}
          {rodape && <p className="mt-3 text-xs text-escuro-texto">{rodape}</p>}
        </div>
      </div>
    </div>
  )
}
