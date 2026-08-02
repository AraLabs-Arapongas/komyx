import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/logo'
import { CapturaLead } from '@/components/captura-lead'
import {
  MolduraCelular, AmostraAgenda, AmostraFaixas, AmostraLoteria,
} from '@/components/landing/amostras'
import { Revela } from '@/components/landing/revela'
import { CurvaMarca } from '@/components/curva-marca'
import { INCLUSO, PLANO } from '@/lib/assinatura/plano'
import {
  Calculator, CalendarClock, Undo2, Search, ShieldCheck, Download,
  EyeOff, Sparkles, Check, X,
} from 'lucide-react'

/*
 * A página que o corretor vê antes de confiar o dinheiro dele ao produto.
 *
 * Ela não inventa prova social: o Komyx é novo e não tem clientes para
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

/* uma linha por recurso, dita como consequência: o corretor compra o que a
   função faz pela vida dele, não a função */
const RECURSOS = [
  { icon: Calculator, titulo: 'Faixa retroativa', texto: 'Subiu de faixa? Nenhum real fica para trás.' },
  { icon: CalendarClock, titulo: 'Agenda de recebimentos', texto: 'Você nunca mais esquece um pagamento.' },
  { icon: Undo2, titulo: 'Desistência tratada', texto: 'Estorno certo, sem refazer conta nenhuma.' },
  { icon: Search, titulo: 'Busca total', texto: 'Qualquer venda em dois toques.' },
  { icon: ShieldCheck, titulo: 'Histórico protegido', texto: 'Questionaram uma comissão? Está tudo registrado.' },
  { icon: EyeOff, titulo: 'Modo privacidade', texto: 'Abra o app em reunião sem expor seus ganhos.' },
  { icon: Download, titulo: 'Seus dados são seus', texto: 'Sair é fácil: leve tudo em um arquivo.' },
  { icon: Sparkles, titulo: 'Sorteio da Federal', texto: 'Cliente sorteado, você fica sabendo primeiro.' },
]

/*
 * ⚠️ DEPOIMENTOS DE EXEMPLO — pessoas fictícias.
 *
 * Trocar por depoimentos REAIS (com autorização por escrito) antes de
 * publicar. Depoimento inventado em página pública é propaganda enganosa
 * (art. 37 do CDC), e a confiança do corretor é o ativo do produto — não
 * vale queimá-la na porta de entrada.
 */
const DEPOIMENTOS = [
  {
    nome: 'Nome do corretor',
    onde: 'Cidade · Administradora',
    texto: '“Depoimento real de um corretor usando o produto: o que mudou na rotina dele depois que largou a planilha.”',
  },
  {
    nome: 'Nome da corretora',
    onde: 'Cidade · Administradora',
    texto: '“Depoimento real: uma história concreta — um erro que o sistema pegou, uma cobrança que ela conseguiu provar.”',
  },
  {
    nome: 'Nome do corretor',
    onde: 'Cidade · Administradora',
    texto: '“Depoimento real: como é abrir o painel no dia do pagamento e o valor bater com o extrato.”',
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
    r: 'Serve — é justamente por isso que o Komyx existe. Você cadastra as faixas, os percentuais, o parcelamento e as datas do seu escritório. O sistema nunca decide a regra: ele executa a sua.',
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
      <div className="superficie-marca relative overflow-hidden text-white">
        {/* manchas de luz sobre o gradiente: profundidade, não enfeite */}
        <div aria-hidden className="brilho-marca pointer-events-none absolute inset-0" />
        <CurvaMarca />
        {/* halo atrás do aparelho: faz o mockup parecer flutuar sobre a página */}
        <div aria-hidden
          className="pointer-events-none absolute -right-10 top-20 h-[36rem] w-[36rem] rounded-full bg-ciano/25 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-6 md:pb-28">
          <header className="flex items-center justify-between">
            <Logo className="[&_span]:text-white" />
            {/* quem já é cliente precisa achar a porta de entrada de primeira:
                fantasma sobre fundo escuro, ela quase não existia */}
            <Button asChild variant="outline"
              className="border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white">
              <Link href="/login">Entrar</Link>
            </Button>
          </header>

          {/* texto e produto compõem uma coisa só: o aparelho encosta na coluna
              de texto (gap negativo no desktop) para não virarem dois blocos
              separados dividindo a tela */}
          <div className="grid items-center gap-10 pt-12 md:grid-cols-[1.1fr_1fr] md:gap-0 md:pt-16">
            <div className="entra relative z-10 text-center md:text-left">
              {/* o posicionamento inteiro já na primeira linha: sem isto a
                  página fala de dinheiro e comissão, mas não diz o mercado */}
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-escuro-texto">
                <Sparkles size={13} className="text-money-claro" />
                Previsibilidade financeira para corretores de consórcio
              </p>
              {/* o concorrente não é o Excel, é a incerteza: a headline fala do
                  que o corretor sente, não da ferramenta que ele larga */}
              <h1 className="mt-5 text-[2.5rem] font-bold leading-[1.12] tracking-tight md:text-6xl">
                Sua comissão não deveria ser uma{' '}
                <span className="text-money-claro">surpresa</span>.
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-lg text-escuro-texto md:mx-0">
                Configure uma vez como seu escritório paga e o Komyx passa a dizer,
                a cada venda, quanto entra na sua conta e em que dia — antes de o
                escritório calcular.
              </p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row md:justify-start">
                <Button asChild size="toque"
                  className="w-full bg-money-claro px-8 text-base text-[#0B132B] hover:bg-money-claro/90 sm:w-auto">
                  <Link href="/cadastro">Começar os 14 dias</Link>
                </Button>
                <Button asChild variant="ghost" size="toque"
                  className="w-full text-escuro-texto hover:bg-white/10 hover:text-white sm:w-auto">
                  <Link href="#como-funciona">Ver como funciona</Link>
                </Button>
              </div>
              <p className="mt-4 text-xs text-escuro-texto">
                14 dias grátis, sem cartão · Funciona no celular · Seus dados saem quando você quiser
              </p>
            </div>

            {/* invade a coluna do texto no desktop: uma composição, não dois
                blocos lado a lado */}
            <div className="entra-suave md:-ml-16 lg:-ml-24">
              {/* flutuação contínua e lenta: profundidade, não distração */}
              <div className="levita">
                <MolduraCelular />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* O problema, na linguagem de quem vive dele */}
      <Secao className="py-20 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight md:text-4xl">
            Você vende. O problema é nunca saber quanto vai receber.
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
          ].map(([titulo, texto], i) => (
            <Revela key={titulo} atraso={i * 110} className="rounded-2xl border bg-card p-5">
              <p className="font-semibold">{titulo}</p>
              <p className="mt-1.5 text-sm text-muted-foreground">{texto}</p>
            </Revela>
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
          {/* timeline: os três círculos ligados por uma linha — é uma sequência,
              não três cartões soltos */}
          <div className="relative mt-12 grid gap-8 md:grid-cols-3">
            <div aria-hidden
              className="absolute top-[18px] hidden h-px w-full bg-gradient-to-r from-transparent via-money/40 to-transparent md:block" />
            {COMO_FUNCIONA.map(({ passo, titulo, texto }, i) => (
              /* o escalonamento acompanha a linha: 1, depois 2, depois 3 */
              <Revela key={passo} atraso={i * 160} className="relative">
                <span className="flex size-9 items-center justify-center rounded-full bg-escuro text-sm font-semibold text-money-claro ring-4 ring-card">
                  {passo}
                </span>
                <h3 className="mt-4 text-lg font-semibold">{titulo}</h3>
                <p className="mt-1.5 text-muted-foreground">{texto}</p>
              </Revela>
            ))}
          </div>
        </Secao>
      </div>

      {/* A regra que a planilha erra */}
      <Secao className="py-20 md:py-24">
        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-14">
          <Revela>
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
          </Revela>
          <Revela atraso={150}><AmostraFaixas /></Revela>
        </div>
      </Secao>

      <div className="bg-card/60 py-20 md:py-24">
        <Secao>
          <div className="grid items-center gap-10 md:grid-cols-2 md:gap-14">
            <Revela atraso={150}><AmostraAgenda /></Revela>
            <Revela className="md:order-first">
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
            </Revela>
          </div>
        </Secao>
      </div>

      {/* Diferencial recente */}
      <Secao className="py-20 md:py-24">
        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-14">
          <Revela>
            <p className="text-sm font-medium text-money">Novidade</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
              O sorteio da Federal, já cruzado com suas cotas.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Os números da Loteria Federal entram sozinhos no painel, direto da fonte —
              e o que bate com a cota de algum cliente seu vem marcado, com um toque
              para abrir a venda.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Cada administradora tem a sua regra de contemplação, então o Komyx
              avisa para você conferir; quem confirma a contemplação é a administradora.
            </p>
          </Revela>
          <Revela atraso={150}><AmostraLoteria /></Revela>
        </div>
      </Secao>

      {/* Honestidade sobre escopo, antes da lista de recursos: a promessa de
          simplicidade vende mais do que a enumeração do que tem dentro */}
      <div className="bg-card/60 py-20 md:py-24">
      <Secao>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight md:text-4xl">
            Uma coisa só, bem feita
          </h2>
          <p className="mt-4 text-muted-foreground">
            O Komyx cuida da sua remuneração. Se você procura outra coisa,
            é melhor saber agora.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <Revela className="rounded-2xl border border-money/30 bg-money-soft p-6">
            <p className="font-semibold text-money">É isto</p>
            <ul className="mt-3 space-y-2">
              {E_NAO_E.e.map(item => (
                <li key={item} className="flex gap-2 text-sm">
                  <Check size={18} className="mt-0.5 shrink-0 text-money" />
                  {item}
                </li>
              ))}
            </ul>
          </Revela>
          <Revela atraso={130} className="rounded-2xl border bg-card p-6">
            <p className="font-semibold text-muted-foreground">Não é isto</p>
            <ul className="mt-3 space-y-2">
              {E_NAO_E.naoE.map(item => (
                <li key={item} className="flex gap-2 text-sm text-muted-foreground">
                  <X size={18} className="mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </Revela>
        </div>
      </Secao>
      </div>

      {/* Recursos */}
      <Secao className="py-20 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight md:text-4xl">
            O que você encontra dentro
          </h2>
        </div>
        <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {RECURSOS.map(({ icon: Icon, titulo, texto }, i) => (
            /* o atraso reinicia por linha de quatro: escalonar os oito em fila
               única deixaria a última linha esperando um segundo inteiro */
            <Revela key={titulo} atraso={(i % 4) * 90}>
              <span className="flex size-11 items-center justify-center rounded-xl bg-money-soft">
                <Icon className="text-money" size={22} />
              </span>
              <h3 className="mt-3 font-semibold">{titulo}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{texto}</p>
            </Revela>
          ))}
        </div>
      </Secao>

      {/* Depoimentos — conteúdo de EXEMPLO, ver aviso no array DEPOIMENTOS */}
      <div className="bg-card/60 py-20 md:py-24">
        <Secao>
          <Revela className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight md:text-4xl">
              Quem largou a planilha
            </h2>
          </Revela>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {DEPOIMENTOS.map((d, i) => (
              <Revela key={i} atraso={i * 110}
                className="flex flex-col rounded-2xl border bg-card p-6">
                <p className="flex-1 text-sm leading-relaxed text-muted-foreground">{d.texto}</p>
                <div className="mt-5 flex items-center gap-3 border-t pt-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-escuro text-sm font-semibold text-money-claro">
                    {d.nome[0]}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{d.nome}</span>
                    <span className="block truncate text-xs text-muted-foreground">{d.onde}</span>
                  </span>
                </div>
              </Revela>
            ))}
          </div>
        </Secao>
      </div>

      {/*
        Preço antes do FAQ, não depois: quem rolou até aqui já entendeu o que o
        produto faz e a próxima pergunta é quanto custa. Enterrar isso embaixo
        das dúvidas obriga a procurar — e preço que se procura parece escondido.
      */}
      <Secao className="py-20 md:py-24">
        <Revela className="mx-auto max-w-xl text-center">
          <p className="text-sm font-medium text-money">Preço</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-4xl">
            Menos que uma comissão. Bem menos.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Uma carta de R$ 120 mil a 0,6% paga sua assinatura por três anos.
          </p>
        </Revela>

        <Revela atraso={140} className="mx-auto mt-10 max-w-md">
          <div className="superficie-marca relative overflow-hidden rounded-3xl p-1.5">
            <div className="relative overflow-hidden rounded-[calc(1.5rem-0.375rem)] border border-white/20 bg-white/10 px-6 py-10 text-white backdrop-blur-xl">
              <CurvaMarca />
              <div className="relative text-center">
                <p className="text-sm text-escuro-texto">{PLANO.nome}</p>
                <p className="mt-2 flex items-baseline justify-center gap-1">
                  <span className="text-lg">{PLANO.moeda}</span>
                  <span className="text-5xl font-bold tracking-tight">{PLANO.valor}</span>
                  <span className="text-lg text-escuro-texto">{PLANO.periodo}</span>
                </p>
                <p className="mt-3 text-sm text-escuro-texto">
                  {PLANO.diasDeTeste} dias grátis. Sem cartão para começar.
                </p>

                <ul className="mt-8 space-y-3 text-left text-sm">
                  {INCLUSO.map(item => (
                    <li key={item} className="flex items-start gap-2.5">
                      <Check size={18} className="mt-0.5 shrink-0 text-money-claro" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <Button asChild size="toque"
                  className="mt-8 w-full bg-money-claro text-[#0B132B] hover:bg-money-claro/90">
                  <Link href="/cadastro">Começar os 14 dias</Link>
                </Button>
                <p className="mt-3 text-xs text-escuro-texto">
                  Cancele quando quiser. Seus dados saem com você.
                </p>
              </div>
            </div>
          </div>
        </Revela>
      </Secao>

      {/* Dúvidas: sobre a superfície escura, para a seção não se perder entre
          os blocos claros */}
      {/* o roxo aqui é mais fundo que o do hero: a seção precisa de peso sem
          competir com a abertura da página */}
      <div className="bg-[#3B2FA8] py-20 text-white md:py-24">
        <Secao>
          <Revela className="mx-auto max-w-2xl">
            <h2 className="text-center text-2xl font-bold tracking-tight md:text-4xl">
              Perguntas que todo corretor faz
            </h2>
            <div className="mt-10 divide-y divide-white/10">
              {/* a primeira já vem aberta: FAQ todo fechado parece vazio */}
              {DUVIDAS.map(({ p, r }, i) => (
                <details key={p} open={i === 0} className="group py-4">
                  <summary className="cursor-pointer list-none font-medium marker:hidden">
                    <span className="flex items-start justify-between gap-4">
                      {p}
                      <span className="mt-1 shrink-0 text-escuro-texto transition-transform group-open:rotate-45">+</span>
                    </span>
                  </summary>
                  <p className="mt-2 text-escuro-texto">{r}</p>
                </details>
              ))}
            </div>
          </Revela>
        </Secao>
      </div>

      {/* Fechamento */}
      <Secao className="py-20 md:py-24">
        <Revela>
        {/* o fechamento vem logo depois do FAQ roxo: sem uma superfície própria
            ele desaparecia dentro do outro roxo. Aqui é vidro fosco sobre o
            gradiente da marca. */}
        <div className="superficie-marca relative overflow-hidden rounded-3xl p-1.5">
        <div className="relative overflow-hidden rounded-[calc(1.5rem-0.375rem)] border border-white/20 bg-white/10 px-6 py-14 text-center text-white backdrop-blur-xl md:px-12">
          {/* a curva fecha a página como abriu: assinatura */}
          <CurvaMarca intensidade="forte" />
          <h2 className="relative text-2xl font-bold tracking-tight md:text-4xl">
            Descubra quanto vai receber antes<br className="hidden md:block" /> do escritório pagar.
          </h2>
          <p className="relative mx-auto mt-3 max-w-md text-escuro-texto">
            14 dias grátis, sem cartão. Configure suas regras e veja sua próxima
            comissão calculada em menos de cinco minutos.
          </p>
          <Button asChild size="toque"
            className="mt-8 bg-money-claro px-8 text-[#0B132B] hover:bg-money-claro/90">
            <Link href="/cadastro">Começar os 14 dias</Link>
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
        </div>
        </Revela>
      </Secao>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        Komyx — gestão financeira para corretores de consórcio.
      </footer>
    </main>
  )
}
