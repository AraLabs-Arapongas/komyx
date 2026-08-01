import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/logo'
import { CapturaLead } from '@/components/captura-lead'
import {
  MolduraCelular, AmostraAgenda, AmostraFaixas, AmostraLoteria,
} from '@/components/landing/amostras'
import {
  Calculator, CalendarClock, Undo2, Search, ShieldCheck, Download,
  EyeOff, Sparkles, Check, X,
} from 'lucide-react'

/*
 * A página que o corretor vê antes de confiar o dinheiro dele ao produto.
 *
 * Ela não inventa prova social: o ConsorPro é novo e não tem clientes para
 * citar. O que ela tem é o próprio produto — cada bloco mostra uma tela de
 * verdade e explica a regra por trás dela. Para quem vive de comissão, ver a
 * regra é a prova que importa.
 */

const COMO_FUNCIONA = [
  {
    passo: '1',
    titulo: 'Conte como seu escritório paga',
    texto: 'Faixas, percentuais, em quantas parcelas, dia do fechamento e dia do pagamento. Uma vez só, num assistente de quatro passos.',
  },
  {
    passo: '2',
    titulo: 'Registre a venda',
    texto: 'Cliente, valor da carta, grupo, cota e administradora. Menos de um minuto, direto do celular, ainda no cliente.',
  },
  {
    passo: '3',
    titulo: 'O resto acontece sozinho',
    texto: 'Faixa aplicada, comissão calculada, parcelas geradas com data e painel atualizado. Você não faz conta nenhuma.',
  },
]

const RECURSOS = [
  {
    icon: Calculator,
    titulo: 'Faixa retroativa, do jeito certo',
    texto: 'A faixa vale pelo total vendido no mês. Ao subir de faixa, tudo que você já vendeu naquele mês é recalculado.',
  },
  {
    icon: CalendarClock,
    titulo: 'Agenda de recebimentos',
    texto: 'Cada parcela com data e valor, agrupada por mês. Dá para filtrar por mês, por status e buscar pelo nome do cliente.',
  },
  {
    icon: Undo2,
    titulo: 'Desistência sem dor de cabeça',
    texto: 'Cliente desistiu? O sistema cancela as parcelas futuras e trata o que já foi pago conforme a política do seu escritório.',
  },
  {
    icon: Search,
    titulo: 'Busca por qualquer coisa',
    texto: 'Cliente, grupo, cota, administradora, número do contrato. Atalho no teclado, resultado na hora.',
  },
  {
    icon: ShieldCheck,
    titulo: 'Histórico que não se perde',
    texto: 'Mês fechado guarda as regras que valiam nele. Mudar a política hoje não reescreve o que você já recebeu.',
  },
  {
    icon: EyeOff,
    titulo: 'Modo privacidade',
    texto: 'Um toque esconde todos os valores. Para abrir o app no meio de uma reunião sem mostrar quanto você ganha.',
  },
  {
    icon: Download,
    titulo: 'Seus dados são seus',
    texto: 'Baixe tudo em um arquivo quando quiser: vendas, clientes, comissões e recebimentos.',
  },
  {
    icon: Sparkles,
    titulo: 'Sorteio da Federal',
    texto: 'O resultado da extração no painel, com as suas cotas marcadas quando o número bate. Um lugar a menos para conferir.',
  },
]

const E_NAO_E = {
  e: [
    'Controle da sua comissão, do cálculo ao recebimento',
    'Previsão de quanto entra nos próximos meses',
    'Agenda financeira das parcelas, por cliente e por mês',
    'Histórico fechado mês a mês, com as regras de cada um',
  ],
  naoE: [
    'Um CRM para gerenciar seu funil de vendas',
    'Um sistema de administradora, com contratos e boletos',
    'Um emissor de propostas ou de documentos',
    'Um ERP financeiro para empresas',
  ],
}

const DUVIDAS = [
  {
    p: 'Meu escritório paga diferente dos outros. Serve pra mim?',
    r: 'Serve — é justamente por isso que o ConsorPro existe. Você cadastra as faixas, os percentuais, o parcelamento e as datas do seu escritório. O sistema nunca decide a regra: ele executa a sua.',
  },
  {
    p: 'E se a política mudar no meio do caminho?',
    r: 'Você edita quando quiser. O mês em aberto é recalculado com a regra nova; os meses já fechados continuam com a regra que valia neles, para o seu histórico não mudar sozinho.',
  },
  {
    p: 'Preciso marcar quando recebo cada parcela?',
    r: 'Não. O escritório paga no dia combinado, então a parcela conta como recebida quando essa data chega. Nada de ficar dando baixa manual.',
  },
  {
    p: 'Consigo levar o que já tenho na planilha?',
    r: 'As vendas antigas você cadastra com a data original e o sistema calcula tudo a partir dela. E a qualquer momento você baixa seus dados de volta em um arquivo.',
  },
  {
    p: 'Funciona no celular?',
    r: 'Foi desenhado para o celular primeiro. Dá para registrar a venda ainda no cliente e instalar na tela de início como um aplicativo.',
  },
]

function Secao({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`mx-auto max-w-5xl px-5 ${className}`}>{children}</section>
}

export default function LandingPage() {
  return (
    <main>
      {/* O visitante vê o produto antes de ler sobre ele: a mesma superfície
          escura que ele encontrará todo dia no painel. */}
      <div className="relative overflow-hidden bg-escuro text-white">
        {/* a curva de crescimento é a assinatura visual do produto; aqui ela
            entra em escala grande, atrás do conteúdo */}
        <svg aria-hidden viewBox="0 0 400 200" preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.15]">
          <defs>
            <linearGradient id="brilho-landing" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="#3DDC97" stopOpacity="0" />
              <stop offset="100%" stopColor="#3DDC97" stopOpacity="1" />
            </linearGradient>
          </defs>
          <path d="M0 190 C 120 185, 210 120, 280 70 S 370 10, 400 0" fill="none"
            stroke="url(#brilho-landing)" strokeWidth="2" />
          <path d="M0 200 C 120 195, 210 130, 280 80 S 370 20, 400 10 L400 200 Z"
            fill="url(#brilho-landing)" opacity="0.22" />
        </svg>
        {/* brilho atrás do aparelho, para o mockup não afundar no fundo escuro */}
        <div aria-hidden
          className="pointer-events-none absolute -right-20 top-24 h-[32rem] w-[32rem] rounded-full bg-money-claro/15 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-6 md:pb-28">
          <header className="flex items-center justify-between">
            <Logo className="[&_span]:text-white [&_rect:first-child]:fill-white [&_rect:not(:first-child)]:fill-[#06291F]" />
            {/* quem já é cliente precisa achar a porta de entrada de primeira:
                fantasma sobre fundo escuro, ela quase não existia */}
            <Button asChild variant="outline"
              className="border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white">
              <Link href="/login">Entrar</Link>
            </Button>
          </header>

          {/* texto e produto lado a lado: em tela larga o hero centralizado
              deixava metade da página vazia */}
          <div className="grid items-center gap-12 pt-12 md:grid-cols-[1.05fr_1fr] md:gap-8 md:pt-16">
            <div className="entra text-center md:text-left">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-escuro-texto">
                <Sparkles size={13} className="text-money-claro" />
                Para corretores de consórcio
              </p>
              <h1 className="mt-5 text-[2.5rem] font-bold leading-[1.05] tracking-tight md:text-6xl">
                Sua planilha não sabe quanto você vai{' '}
                <span className="text-money-claro">receber</span>.
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-lg text-escuro-texto md:mx-0">
                O ConsorPro sabe. Configure uma vez como seu escritório paga comissão e,
                a partir daí, só registre as vendas — o cálculo, as parcelas e as datas
                saem prontos.
              </p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row md:justify-start">
                <Button asChild size="lg"
                  className="h-12 w-full bg-money-claro px-8 text-base text-[#06291F] hover:bg-money-claro/90 sm:w-auto">
                  <Link href="/cadastro">Criar conta grátis</Link>
                </Button>
                <Button asChild variant="ghost" size="lg"
                  className="h-12 w-full text-escuro-texto hover:bg-white/10 hover:text-white sm:w-auto">
                  <Link href="#como-funciona">Ver como funciona</Link>
                </Button>
              </div>
              <p className="mt-4 text-xs text-escuro-texto">
                Sem cartão de crédito · Funciona no celular · Seus dados saem quando você quiser
              </p>
            </div>

            <div className="entra-suave">
              <MolduraCelular />
            </div>
          </div>
        </div>
      </div>

      {/* O problema, na linguagem de quem vive dele */}
      <Secao className="py-20 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight md:text-4xl">
            O problema não é vender. É o que vem depois.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Fechou a venda, e aí? Quanto isso vira de comissão, em quantas parcelas,
            caindo em que dia, e quanto entra somando tudo no mês que vem. Hoje essa
            resposta mora numa planilha que você mesmo construiu, mantém na mão e
            confere duas vezes porque no fundo não confia.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {[
            ['Fórmula quebrada', 'Uma linha arrastada errado e o mês inteiro sai torto — e você só descobre quando o pagamento não bate.'],
            ['Faixa esquecida', 'Você subiu de faixa no dia 20 e não voltou para recalcular as vendas do começo do mês. O dinheiro fica lá.'],
            ['Cobrança no escuro', 'O escritório pagou a menos e você não tem como provar, porque a sua conta é a mesma planilha que ele contesta.'],
          ].map(([titulo, texto]) => (
            <div key={titulo} className="rounded-2xl border bg-card p-5">
              <p className="font-semibold">{titulo}</p>
              <p className="mt-1.5 text-sm text-muted-foreground">{texto}</p>
            </div>
          ))}
        </div>
      </Secao>

      {/* Como funciona */}
      <div id="como-funciona" className="scroll-mt-8 bg-card/60 py-20 md:py-24">
        <Secao>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight md:text-4xl">
              Três passos. Depois disso, você só vende.
            </h2>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {COMO_FUNCIONA.map(({ passo, titulo, texto }) => (
              <div key={passo}>
                <span className="flex size-9 items-center justify-center rounded-full bg-escuro text-sm font-semibold text-money-claro">
                  {passo}
                </span>
                <h3 className="mt-4 text-lg font-semibold">{titulo}</h3>
                <p className="mt-1.5 text-muted-foreground">{texto}</p>
              </div>
            ))}
          </div>
        </Secao>
      </div>

      {/* A regra que a planilha erra */}
      <Secao className="py-20 md:py-24">
        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-14">
          <div>
            <p className="text-sm font-medium text-money">Faixa por acumulado do mês</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
              Subiu de faixa? O mês inteiro sobe junto.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Na maioria dos escritórios a faixa vale para tudo que você vendeu no mês,
              não só para a venda que passou do limite. É a conta que mais dá trabalho
              na planilha e a que mais deixa dinheiro para trás quando é esquecida.
            </p>
            <p className="mt-3 text-muted-foreground">
              Aqui ela é automática: cada venda nova recalcula o mês em aberto.
            </p>
          </div>
          <AmostraFaixas />
        </div>
      </Secao>

      <div className="bg-card/60 py-20 md:py-24">
        <Secao>
          <div className="grid items-center gap-10 md:grid-cols-2 md:gap-14">
            <AmostraAgenda />
            <div className="md:order-first">
              <p className="text-sm font-medium text-money">Agenda financeira</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
                Saiba hoje o que entra em novembro.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Toda venda vira parcelas com data e valor. A agenda mostra o que já caiu,
                o que ainda vem e de qual cliente é cada real — filtrando por mês ou
                buscando pelo nome.
              </p>
              <p className="mt-3 text-muted-foreground">
                É a diferença entre torcer para o mês fechar e saber que ele fecha.
              </p>
            </div>
          </div>
        </Secao>
      </div>

      {/* Diferencial recente */}
      <Secao className="py-20 md:py-24">
        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-14">
          <div>
            <p className="text-sm font-medium text-money">Novidade</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
              O sorteio da Federal, já cruzado com suas cotas.
            </h2>
            <p className="mt-4 text-muted-foreground">
              O resultado da extração aparece no painel, e o número que bate com a cota de
              algum cliente seu vem marcado — com um toque para abrir a venda.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Cada administradora tem a sua regra de contemplação, então o ConsorPro
              avisa para você conferir; quem confirma a contemplação é a administradora.
            </p>
          </div>
          <AmostraLoteria />
        </div>
      </Secao>

      {/* Recursos */}
      <div className="bg-card/60 py-20 md:py-24">
        <Secao>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight md:text-4xl">
              O que você encontra dentro
            </h2>
          </div>
          <div className="mt-12 grid gap-x-8 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
            {RECURSOS.map(({ icon: Icon, titulo, texto }) => (
              <div key={titulo}>
                <Icon className="text-money" size={20} />
                <h3 className="mt-3 font-semibold">{titulo}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{texto}</p>
              </div>
            ))}
          </div>
        </Secao>
      </div>

      {/* Honestidade sobre escopo: economiza o tempo de quem procura outra coisa */}
      <Secao className="py-20 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight md:text-4xl">
            Uma coisa só, bem feita
          </h2>
          <p className="mt-4 text-muted-foreground">
            O ConsorPro cuida da sua remuneração. Se você procura outra coisa,
            é melhor saber agora.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-money/30 bg-money-soft p-6">
            <p className="font-semibold text-money">É isto</p>
            <ul className="mt-3 space-y-2">
              {E_NAO_E.e.map(item => (
                <li key={item} className="flex gap-2 text-sm">
                  <Check size={18} className="mt-0.5 shrink-0 text-money" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border bg-card p-6">
            <p className="font-semibold text-muted-foreground">Não é isto</p>
            <ul className="mt-3 space-y-2">
              {E_NAO_E.naoE.map(item => (
                <li key={item} className="flex gap-2 text-sm text-muted-foreground">
                  <X size={18} className="mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Secao>

      {/* Dúvidas */}
      <div className="bg-card/60 py-20 md:py-24">
        <Secao>
          <div className="mx-auto max-w-2xl">
            <h2 className="text-center text-2xl font-bold tracking-tight md:text-4xl">
              Perguntas que todo corretor faz
            </h2>
            <div className="mt-10 divide-y">
              {DUVIDAS.map(({ p, r }) => (
                <details key={p} className="group py-4">
                  <summary className="cursor-pointer list-none font-medium marker:hidden">
                    <span className="flex items-start justify-between gap-4">
                      {p}
                      <span className="mt-1 shrink-0 text-muted-foreground transition-transform group-open:rotate-45">+</span>
                    </span>
                  </summary>
                  <p className="mt-2 text-muted-foreground">{r}</p>
                </details>
              ))}
            </div>
          </div>
        </Secao>
      </div>

      {/* Fechamento */}
      <Secao className="py-20 md:py-24">
        <div className="rounded-3xl bg-escuro px-6 py-14 text-center text-white md:px-12">
          <h2 className="text-2xl font-bold tracking-tight md:text-4xl">
            Comece pelo próximo mês.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-escuro-texto">
            Configure suas regras hoje e registre a próxima venda aqui em vez da planilha.
            Em trinta dias você vai ter o mês inteiro fechado sem ter feito uma conta.
          </p>
          <Button asChild size="lg"
            className="mt-8 h-12 bg-money-claro px-8 text-base text-[#06291F] hover:bg-money-claro/90">
            <Link href="/cadastro">Criar conta grátis</Link>
          </Button>

          <div className="mx-auto mt-12 max-w-md border-t border-white/10 pt-8">
            <p className="text-sm text-escuro-texto">
              Ainda não quer criar conta? Deixe seu e-mail que a gente avisa das novidades.
            </p>
            <div className="mt-4">
              <CapturaLead origem="landing-rodape" />
            </div>
          </div>
        </div>
      </Secao>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        ConsorPro — gestão financeira para corretores de consórcio.
      </footer>
    </main>
  )
}
