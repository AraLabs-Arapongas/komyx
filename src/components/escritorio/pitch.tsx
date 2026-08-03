import { Check, Building2 } from 'lucide-react'
import { CapturaLead } from '@/components/captura-lead'
import { PLANO_ESCRITORIO, INCLUSO_ESCRITORIO } from '@/lib/assinatura/plano'

/**
 * O que aparece para quem ainda não tem escritório.
 *
 * O mesmo argumento da landing, terminando num pedido de contato — não num
 * botão de criar.
 *
 * Criar era livre e o painel do dono abria inteiro com a assinatura pendente:
 * dava para montar a equipe e usar o Enterprise sem passar por cobrança
 * nenhuma. Tapar isso trancando o painel depois de criado seria pior — a
 * pessoa faz o trabalho de cadastrar a equipe para encontrar uma porta
 * fechada no fim. O escritório passa a nascer do acerto comercial: a gente
 * cria e ativa junto, e ninguém monta nada para depois descobrir o preço.
 */
export function PitchEscritorio({ email }: { email?: string }) {
  return (
    <div className="space-y-4">
      <section className="entra-suave space-y-4 rounded-lg border bg-card p-4 md:p-5">
        <div className="flex items-start gap-2.5">
          <Building2 size={18} className="mt-0.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="font-medium">{PLANO_ESCRITORIO.nome}</h2>
            <p className="text-sm text-muted-foreground">{PLANO_ESCRITORIO.apoio}</p>
          </div>
          {/* o preço encosta no título: quem abre esta tela veio saber quanto
              custa, e fazê-lo rolar até o fim do cartão para descobrir é
              esconder a única informação que ele procurava */}
          <p className="shrink-0 text-right">
            <span className="text-lg font-semibold">
              {PLANO_ESCRITORIO.moeda} {PLANO_ESCRITORIO.valor}
            </span>
            <span className="text-sm text-muted-foreground">{PLANO_ESCRITORIO.periodo}</span>
          </p>
        </div>

        <ul className="space-y-3 text-sm">
          {INCLUSO_ESCRITORIO.map(item => (
            <li key={item} className="flex items-start gap-2.5">
              <Check size={18} className="mt-0.5 shrink-0 text-money" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="entra-suave space-y-3 rounded-lg border bg-card p-4 md:p-5">
        <p className="text-sm text-muted-foreground">
          São {PLANO_ESCRITORIO.moeda} {PLANO_ESCRITORIO.valor} por mês para até{' '}
          {PLANO_ESCRITORIO.corretoresInclusos} corretores, e o dono não ocupa
          vaga. Deixe seu contato: a gente monta o escritório com você e ativa
          tudo junto.
        </p>
        <CapturaLead origem="escritorio" empilhado emailInicial={email}
          rotulo="Quero falar sobre o Enterprise" />
      </section>
    </div>
  )
}
