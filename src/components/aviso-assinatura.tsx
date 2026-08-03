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

  return (
    /* o link cobre a mensagem e o X fica de fora dele: um botão dentro de uma
       âncora é o tipo de aninhamento que o leitor de tela anuncia errado e que
       o toque acerta pela metade */
    /* o atributo é o que o hero do painel enxerga para deixar de sangrar por
       baixo do cabeçalho — ver a regra no globals.css. Fica aqui, e não no
       layout do servidor, porque só este componente sabe se a tarja foi
       dispensada neste aparelho */
    <div data-aviso-assinatura
      className="entra-suave mb-4 flex items-center gap-1 rounded-lg border border-[#F59E0B]/40
                 bg-[#F59E0B]/10 pr-1.5 text-sm">
      <Link href={DESTINO}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-[#F59E0B]/15">
        <Icone size={18} className="shrink-0 text-[#B45309]" />
        <span className="min-w-0 flex-1">
          {cobrancaFalhou ? (
            <>
              <span className="font-medium">Não conseguimos cobrar seu cartão.</span>{' '}
              <span className="text-muted-foreground">Atualize os dados para não perder o acesso.</span>
            </>
          ) : (
            <>
              <span className="font-medium">
                {/* "1 dia" pode ser 2 horas ou 23: dizer as horas evita prometer
                    um dia inteiro que não existe */}
                {dias === 1 ? 'Seu teste acaba em menos de 24 horas.' : `Seu teste acaba em ${dias} dias.`}
              </span>{' '}
              <span className="text-muted-foreground">Assine para continuar sem interrupção.</span>
            </>
          )}
        </span>
        <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
      </Link>

      <button type="button" onClick={dispensar} aria-label="Fechar aviso"
        className="shrink-0 rounded-full p-2 text-muted-foreground transition-colors
                   hover:bg-[#F59E0B]/20 hover:text-foreground">
        <X size={16} />
      </button>
    </div>
  )
}
