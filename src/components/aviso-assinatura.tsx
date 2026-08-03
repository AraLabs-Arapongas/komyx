'use client'
import { useCallback, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Clock, CreditCard, X } from 'lucide-react'
import { temAvisoDeAssinatura, type Acesso } from '@/lib/assinatura/acesso'

const DESTINO = '/app/perfil/assinatura'
const CHAVE = 'komyx:aviso-assinatura-dispensado'

/*
 * Fechar vale para esta sessão, não para sempre: `sessionStorage`.
 *
 * A diferença é deliberada. Guardado no aparelho, um toque no X apagaria o
 * aviso pelos catorze dias inteiros, e o corretor descobriria o fim do teste
 * pelo portão. Preso à aba, ele sai da frente de quem está no meio de uma
 * tarefa e volta na próxima vez que o app for aberto.
 *
 * A leitura é `useSyncExternalStore`, como o modo privacidade: sem provider e
 * sem efeito copiando o valor para dentro de um estado.
 */
const ouvintes = new Set<() => void>()

function assinar(aoMudar: () => void) {
  ouvintes.add(aoMudar)
  return () => { ouvintes.delete(aoMudar) }
}

function lerDoAparelho(): string | null {
  return window.sessionStorage.getItem(CHAVE)
}

/*
 * No servidor não há aba, então o HTML sai com a tarja visível.
 *
 * É a escolha entre dois piscares. Quem NÃO fechou — quase todo mundo, e quem
 * mais precisa ler o aviso — vê a tarja já no primeiro quadro, sem espera.
 * Quem fechou vê ela sumir num piscar. O contrário faria o aviso chegar
 * atrasado para todos, para poupar o piscar de quem já resolveu.
 */
function lerNoServidor(): string | null {
  return null
}

function useDispensa(chave: string) {
  const dispensado = useSyncExternalStore(assinar, lerDoAparelho, lerNoServidor)

  const dispensar = useCallback(() => {
    window.sessionStorage.setItem(CHAVE, chave)
    for (const ouvinte of ouvintes) ouvinte()
  }, [chave])

  return { escondido: dispensado === chave, dispensar }
}

/**
 * A tarja que avisa antes de o app fechar a porta.
 *
 * Dois casos, e nenhum deles é surpresa: o teste está acabando, ou o cartão
 * recusou e o Stripe ainda está tentando. Nos dois, o corretor tem alguns dias
 * para agir — e é a diferença entre resolver com calma e descobrir na segunda
 * de manhã que o app não abre.
 *
 * Não some sozinha e não pode ser ignorada para sempre: o X a fecha até o
 * corretor abrir o app de novo, e a chave carrega o número de dias — se
 * sobrar um a menos, ela volta na mesma sessão. A urgência aumenta e o aviso
 * acompanha, em vez de sumir justamente quando passa a importar.
 *
 * Fora desses dois casos não renderiza nada. É de propósito que a decisão more
 * aqui, e não no layout: assim o layout não precisa saber quais estados de
 * assinatura merecem tarja.
 */
export function AvisoAssinatura({ acesso }: { acesso: Acesso }) {
  const pathname = usePathname()
  // mesma conta do AppNav, que decide ali se o cabeçalho é transparente
  const noPainel = pathname === '/app'
  const cobrancaFalhou = acesso.liberado && acesso.motivo === 'cobranca_falhou'
  const dias = acesso.liberado && acesso.motivo === 'teste' ? acesso.diasRestantes : 0

  /*
   * A chave carrega o quanto o caso mudou desde a última vez.
   *
   * Para o teste é o número de dias; para a cobrança recusada é o dia de hoje,
   * porque ali não há contagem regressiva para mudar sozinha.
   */
  const chave = cobrancaFalhou
    ? `cobranca:${new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })}`
    : `teste:${dias}`
  const { escondido, dispensar } = useDispensa(chave)

  if (!temAvisoDeAssinatura(acesso)) return null
  // na própria tela de assinatura a tarja repetiria, palavra por palavra, o
  // que já está no cartão logo abaixo dela
  if (pathname === DESTINO) return null
  if (escondido) return null

  const Icone = cobrancaFalhou ? CreditCard : Clock

  /* o link cobre a mensagem e o X fica de fora dele: um botão dentro de uma
     âncora é o tipo de aninhamento que o leitor de tela anuncia errado e que o
     toque acerta pela metade */
  const cartao = (
    <div className="flex items-center gap-1 rounded-lg border border-[#F59E0B]/50 bg-card
                    pr-1.5 text-sm shadow-lg shadow-black/10">
      <Link href={DESTINO}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-[#F59E0B]/10">
        <Icone size={18} className="shrink-0 text-[#B45309]" />
        {/*
          Uma linha, e curta. Flutuando sobre a tela, cada linha a mais tapa
          conteúdo — a versão de três linhas cobria a manchete do painel. O que
          fazer a respeito está do outro lado do toque, que é para onde a seta
          aponta.
        */}
        <span className="min-w-0 flex-1 truncate font-medium">
          {cobrancaFalhou
            ? 'Não conseguimos cobrar seu cartão'
            /* "1 dia" pode ser 2 horas ou 23: nem "hoje" nem "amanhã" estão
               garantidos, e as horas não prometem um dia que talvez não exista */
            : dias === 1 ? 'Seu teste acaba em menos de 24h' : `Seu teste acaba em ${dias} dias`}
        </span>
        <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
      </Link>

      <button type="button" onClick={dispensar} aria-label="Fechar aviso"
        className="shrink-0 rounded-full p-2 text-muted-foreground transition-colors
                   hover:bg-muted hover:text-foreground">
        <X size={16} />
      </button>
    </div>
  )

  /*
   * Fora do painel ela entra na fila e desce o conteúdo alguns pixels.
   *
   * Ali não há hero para flutuar sobre: logo abaixo do cabeçalho vêm o título
   * da página e o botão de ação, e uma tarja fixa tapava exatamente os dois.
   */
  if (!noPainel) return <div data-aviso-assinatura className="entra-suave mb-4">{cartao}</div>

  /*
   * No painel ela flutua. O cabeçalho é transparente e a aurora começa no topo
   * da tela; uma tarja no fluxo empurrava tudo para baixo e matava a abertura
   * de marca por causa de um aviso de uma linha.
   *
   * Os recuos repetem os do `main` e do container de conteúdo, para o cartão
   * nascer alinhado com a coluna que ele interrompe em vez de flutuar torto
   * alguns pixels para fora dela.
   */
  return (
    <div data-aviso-assinatura
      className="entra fixed inset-x-0 top-[calc(var(--altura-cabecalho-painel)+0.5rem)] z-40 px-4 md:pl-44 md:pr-0">
      <div className="mx-auto max-w-3xl md:px-6">{cartao}</div>
    </div>
  )
}
