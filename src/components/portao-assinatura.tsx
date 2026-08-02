import { Logo } from '@/components/logo'
import { CartaoPlano } from '@/components/cartao-plano'
import { BotaoAssinar } from '@/components/botoes-assinatura'
import { BotaoBaixarDados } from '@/components/botao-baixar-dados'
import { BotaoSair } from '@/components/botao-sair'
import { PLANO } from '@/lib/assinatura/plano'

/**
 * A tela que ocupa o app quando não há mais acesso.
 *
 * Ocupa a rota em vez de redirecionar, pelo mesmo motivo que o onboarding: um
 * redirect no layout é servido também aos prefetch dos links do menu, e a
 * entrada de cache do router nunca é satisfeita — o Next repete o pedido para
 * sempre e a página parece travada.
 *
 * Nada aqui culpa o corretor. Ele testou, o prazo acabou, e as duas saídas
 * honestas estão na tela: assinar, ou levar os dados embora.
 */
export function PortaoAssinatura({ motivo }: { motivo: 'teste_acabou' | 'assinatura_acabou' }) {
  const acabouOTeste = motivo === 'teste_acabou'

  return (
    <main className="min-h-dvh px-4 py-10">
      <div className="mx-auto w-full max-w-md space-y-6">
        <header className="space-y-3 text-center">
          {/* inline-flex dentro de um bloco com text-center: centraliza sem
              precisar de mais uma camada de flex */}
          <Logo grande />
          <h1 className="text-2xl font-bold tracking-tight">
            {acabouOTeste
              ? `Seus ${PLANO.diasDeTeste} dias terminaram`
              : 'Sua assinatura foi encerrada'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {acabouOTeste
              ? 'Suas vendas, clientes e comissões continuam aqui, do jeito que você deixou. Assine para voltar a usar.'
              : 'Seus dados continuam guardados. Assine de novo para voltar a usar, ou baixe tudo em um arquivo.'}
          </p>
        </header>

        <CartaoPlano
          acao={<BotaoAssinar />}
          rodape="Cancele quando quiser, direto pelo app."
        />

        <div className="space-y-3">
          {/* a saída sem pagar fica visível, não escondida: quem não vai
              assinar precisa dos dados dele hoje, não depois de insistir */}
          <BotaoBaixarDados variant="outline" />
          <BotaoSair variante="botao" />
        </div>
      </div>
    </main>
  )
}
