import { CheckCircle2, Clock, TriangleAlert } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CabecalhoPagina } from '@/components/ui/cabecalho-pagina'
import { Secao } from '@/components/config-form'
import { CartaoPlano } from '@/components/cartao-plano'
import { BotaoAssinar, BotaoPortal } from '@/components/botoes-assinatura'
import { avaliarAcesso } from '@/lib/assinatura/acesso'
import { PLANO } from '@/lib/assinatura/plano'
import { stripeConfigurado } from '@/lib/stripe/servidor'
import { diaDoInstante, formatDataExtenso } from '@/lib/format'

/**
 * O estado da assinatura, em uma frase, e o que dá para fazer a respeito.
 *
 * A cobrança em si mora no Stripe — trocar cartão, baixar nota, cancelar. Isso
 * é de propósito: reimplementar essas telas significaria acertar sozinho todos
 * os casos de borda de um sistema de pagamento, e errar ali custa a confiança
 * de quem já pagou.
 */
export default async function AssinaturaPage({ searchParams }: {
  searchParams: Promise<{ assinou?: string }>
}) {
  const { assinou } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase.from('profiles')
    .select('trial_termina_em, assinatura_status, assinatura_ate, cancela_no_fim, stripe_customer_id')
    .eq('id', user?.id ?? '').maybeSingle()

  const acesso = avaliarAcesso(perfil ?? null)
  const assinante = Boolean(perfil?.assinatura_status)
  const ate = perfil?.assinatura_ate ? formatDataExtenso(diaDoInstante(perfil.assinatura_ate), true) : null
  const fimDoTeste = perfil?.trial_termina_em
    ? formatDataExtenso(diaDoInstante(perfil.trial_termina_em), true) : null

  return (
    <div className="space-y-4">
      <CabecalhoPagina voltarPara="/app/perfil" titulo="Assinatura"
        apoio="Como está sua conta e o que já está pago." />

      {/*
        Volta do checkout. A confirmação que vale é a do webhook, e ele pode
        chegar segundos depois — dizer "está ativa" agora seria mentir metade
        das vezes. Dizer que o pagamento passou é verdade em todas.
      */}
      {assinou && (
        <div className="entra-suave flex items-start gap-2.5 rounded-lg border border-money/40
                        bg-money/10 px-3 py-2.5 text-sm">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-money" />
          <span>
            <span className="font-medium">Pagamento confirmado. Obrigado!</span>{' '}
            <span className="text-muted-foreground">
              A assinatura pode levar alguns instantes para aparecer aqui.
            </span>
          </span>
        </div>
      )}

      <Secao>
        <EstadoAtual
          motivo={acesso.motivo}
          diasRestantes={acesso.liberado && acesso.motivo === 'teste' ? acesso.diasRestantes : 0}
          cancelaNoFim={Boolean(perfil?.cancela_no_fim)}
          ate={ate}
          fimDoTeste={fimDoTeste}
        />

        {assinante && perfil?.stripe_customer_id && (
          <>
            <BotaoPortal />
            <p className="text-xs text-muted-foreground">
              O portal do Stripe abre em outra página: lá você troca o cartão, baixa os recibos e
              cancela quando quiser.
            </p>
          </>
        )}
      </Secao>

      {/* O cartão do plano só aparece para quem ainda não assinou: para quem
          já paga, ele seria uma oferta de algo que a pessoa já tem. */}
      {!assinante && (
        <CartaoPlano
          acao={stripeConfigurado()
            ? <BotaoAssinar rotulo={acesso.liberado ? 'Assinar agora' : 'Assinar e voltar a usar'} />
            : null}
          rodape={stripeConfigurado()
            ? 'Cancele quando quiser, direto pelo app.'
            : 'O pagamento ainda está sendo preparado. Você será avisado antes de qualquer cobrança.'}
        />
      )}
    </div>
  )
}

/** A frase que resume onde a conta está, com o ícone que dá o tom. */
function EstadoAtual({ motivo, diasRestantes, cancelaNoFim, ate, fimDoTeste }: {
  motivo: 'assinatura' | 'teste' | 'cobranca_falhou' | 'indefinido' | 'teste_acabou' | 'assinatura_acabou'
  diasRestantes: number
  cancelaNoFim: boolean
  ate: string | null
  fimDoTeste: string | null
}) {
  const conteudo = {
    assinatura: cancelaNoFim
      ? {
        icone: Clock, tom: 'text-[#B45309]',
        titulo: 'Assinatura cancelada',
        apoio: ate ? `Você continua com acesso até ${ate}.` : 'Você continua com acesso até o fim do período pago.',
      }
      : {
        icone: CheckCircle2, tom: 'text-money',
        titulo: 'Assinatura ativa',
        apoio: ate ? `Renova em ${ate}, por ${PLANO.moeda} ${PLANO.valor}.` : `${PLANO.moeda} ${PLANO.valor} por mês.`,
      },
    teste: {
      icone: Clock, tom: 'text-muted-foreground',
      titulo: diasRestantes === 1
        ? 'Seu teste acaba em menos de 24 horas'
        : `Faltam ${diasRestantes} dias de teste`,
      apoio: fimDoTeste
        ? `O acesso vai até ${fimDoTeste}. Nenhuma cobrança até você assinar.`
        : 'Nenhuma cobrança até você assinar.',
    },
    cobranca_falhou: {
      icone: TriangleAlert, tom: 'text-[#B45309]',
      titulo: 'Não conseguimos cobrar seu cartão',
      apoio: 'Vamos tentar de novo nos próximos dias. Atualize os dados no portal para não perder o acesso.',
    },
    /* leitura do perfil falhou, ou é conta anterior ao teste existir. Não
       inventa prazo nem cobrança: diz que está liberada, que é o que se sabe */
    indefinido: {
      icone: CheckCircle2, tom: 'text-money',
      titulo: 'Sua conta está liberada',
      apoio: 'Nenhuma cobrança em aberto.',
    },
    teste_acabou: {
      icone: TriangleAlert, tom: 'text-[#B45309]',
      titulo: `Seus ${PLANO.diasDeTeste} dias terminaram`,
      apoio: 'Seus dados continuam guardados. Assine para voltar a usar.',
    },
    assinatura_acabou: {
      icone: TriangleAlert, tom: 'text-[#B45309]',
      titulo: 'Assinatura encerrada',
      apoio: 'Seus dados continuam guardados. Assine de novo quando quiser.',
    },
  }[motivo]

  const Icone = conteudo.icone
  return (
    <div className="flex items-start gap-3">
      <Icone size={20} className={`mt-0.5 shrink-0 ${conteudo.tom}`} />
      <div className="space-y-1">
        <p className="font-medium">{conteudo.titulo}</p>
        <p className="text-sm text-muted-foreground">{conteudo.apoio}</p>
      </div>
    </div>
  )
}
