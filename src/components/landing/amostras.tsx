import {
  Sparkles, LayoutDashboard, ShoppingBag, Wallet, Users, CircleUser,
  Search, Eye, LogOut,
} from 'lucide-react'
import { NumeroAnimado } from '@/components/numero-animado'
import { LogoSimbolo } from '@/components/logo'

/*
 * Amostras do produto para a landing.
 *
 * São remontagens em markup, não capturas de tela: ficam nítidas em qualquer
 * densidade, acompanham o tema e não envelhecem junto com um PNG esquecido em
 * public/. Os dados são ilustrativos e escolhidos para explicar a regra —
 * valores redondos, nomes comuns.
 */

/**
 * O app inteiro dentro de uma moldura de celular.
 *
 * O corretor usa isto no celular, entre uma visita e outra — mostrar a tela
 * solta num retângulo escuro não diz nada. Dentro do aparelho, ele reconhece
 * o que vai ter na mão.
 */
export function MolduraCelular() {
  return (
    <div className="mx-auto w-[350px] rounded-[2.8rem] border border-white/15 bg-[#070D1F] p-2.5 shadow-[0_40px_90px_-20px_rgba(0,0,0,0.65)] md:w-[410px]">
      {/* proporção de aparelho de verdade: o que passar disso fica cortado,
          como ficaria na tela do corretor antes de ele rolar */}
      {/*
        `text-foreground` explícito: o aparelho é desenhado dentro do hero da
        landing, que é `text-white`, e a tela dele é clara. Quem não trazia cor
        própria saía branco sobre branco — era o caso de "R$ 1,2 mi", que
        simplesmente não existia para quem olhava a página.
      */}
      <div className="flex aspect-[9/19.5] flex-col overflow-hidden rounded-[2.1rem] bg-background text-foreground">
        {/*
          O bloco da marca começa no topo do aparelho e termina em onda, como
          no painel de verdade: lá o cabeçalho é transparente e flutua sobre a
          aurora, em vez de cortá-la com uma faixa branca.
        */}
        <div className="superficie-marca relative px-4 pb-8 pt-3 text-white
                        [clip-path:url(#recorte-onda-amostra)]">
          <div aria-hidden className="brilho-marca pointer-events-none absolute inset-0" />

          {/* cabeçalho: marca à esquerda, as três ações à direita */}
          <div className="relative flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <LogoSimbolo sobreEscuro />
              {/* a palavra acompanha a escala do desenho, que é menor que a do
                  app — o resto do aparelho está todo em 0,7rem */}
              <span className="text-[0.95rem] font-bold tracking-tight">komyx</span>
            </span>
            <span className="flex items-center gap-2 text-white/90">
              <Search size={14} /><Eye size={14} /><LogOut size={14} />
            </span>
          </div>

          <div className="relative mt-4">
            <p className="text-[0.7rem] text-escuro-texto">
              Olá, <span className="font-semibold text-white">Marcos</span> 👋
            </p>
            <p className="mt-3 text-[0.7rem] text-escuro-texto">Você receberá</p>
            <p className="mt-0.5 text-[2.2rem] font-bold leading-none tracking-tight tabular-nums text-money-claro">
              <NumeroAnimado ateCentavos={840000} />
            </p>
            <p className="mt-1.5 text-[0.65rem] text-escuro-texto">
              em 6 dias <span className="text-white/40">· 10 de setembro</span>
            </p>
            <div className="mt-4 rounded-lg bg-money-claro py-2 text-center text-xs font-medium text-[#0B132B]">
              + Nova venda
            </div>
          </div>

          {/*
            Recorte próprio, com id próprio: o do painel mora dentro do
            HeroDinheiro, que não roda nesta página, e dois clipPath com o mesmo
            id no mesmo documento se atropelam. O traçado é o mesmo.
          */}
          <svg aria-hidden width="0" height="0" className="absolute">
            <defs>
              <clipPath id="recorte-onda-amostra" clipPathUnits="objectBoundingBox">
                <path d="M0,0 H1 V0.955 C0.86,1.002 0.62,1.005 0.44,0.972 C0.27,0.942 0.1,0.945 0,0.975 Z" />
              </clipPath>
            </defs>
          </svg>
        </div>

        {/* números do mês e o sorteio, lado a lado como no produto */}
        <div className="flex-1 space-y-4 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <p className="text-[0.6rem] text-muted-foreground">Agosto em números</p>
              {[['Vendido', 'R$ 1,2 mi'], ['Comissão', 'R$ 8.400'], ['Falta receber', 'R$ 5.300']].map(([r, v], i) => (
                <div key={r}>
                  <p className="text-[0.55rem] text-muted-foreground">{r}</p>
                  <p className={`text-[0.7rem] font-semibold tabular-nums ${i > 0 ? 'text-money' : ''}`}>{v}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-[0.6rem] text-muted-foreground">Loteria Federal</p>
              <div className="divide-y overflow-hidden rounded-lg bg-card">
                {BILHETES.map(b => (
                  <div key={b.premio} className="flex items-center justify-between px-2 py-1.5">
                    <span className="text-[0.5rem] text-muted-foreground">{b.premio}</span>
                    <span className={`flex items-center gap-1 font-mono text-[0.6rem] font-semibold tabular-nums ${b.seu ? 'text-money' : ''}`}>
                      {b.seu && <Sparkles size={9} className="shrink-0" />}
                      {b.numero}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { titulo: 'Últimas vendas', nome: 'Ana Ribeiro', apoio: 'Carta R$ 620.000', valor: 'R$ 4.340' },
              { titulo: 'Próximos recebimentos', nome: 'Rogério Pinto', apoio: '10 de setembro', valor: 'R$ 2.400' },
            ].map(c => (
              <div key={c.titulo} className="space-y-2">
                <p className="truncate text-[0.6rem] text-muted-foreground">{c.titulo}</p>
                <div className="rounded-lg bg-card px-2 py-2">
                  <p className="truncate text-[0.65rem] font-medium">{c.nome}</p>
                  <p className="truncate text-[0.5rem] text-muted-foreground">{c.apoio}</p>
                  <p className="mt-0.5 text-[0.65rem] font-semibold text-money tabular-nums">{c.valor}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* a barra de baixo fecha o aparelho e mostra o tamanho do produto */}
        <nav className="flex border-t bg-card">
          {[
            { rotulo: 'Início', Icone: LayoutDashboard, ativo: true },
            { rotulo: 'Vendas', Icone: ShoppingBag, ativo: false },
            { rotulo: 'Recebimentos', Icone: Wallet, ativo: false },
            { rotulo: 'Clientes', Icone: Users, ativo: false },
            { rotulo: 'Perfil', Icone: CircleUser, ativo: false },
          ].map(({ rotulo, Icone, ativo }) => (
            <span key={rotulo}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[0.5rem] ${ativo ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
              <Icone size={13} />{rotulo}
            </span>
          ))}
        </nav>
      </div>
    </div>
  )
}

/** O bloco escuro que abre o painel: quanto e quando. */
export function AmostraPainel() {
  return (
    <div className="rounded-3xl superficie-marca p-6 text-white shadow-2xl shadow-black/20 md:p-8">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-escuro-texto">Olá, <span className="font-semibold text-white">Marcos</span> 👋</p>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium">Setembro</span>
      </div>
      <p className="mt-5 text-escuro-texto">Você receberá</p>
      <p className="mt-1 text-[2.75rem] font-bold leading-[1.05] tracking-tight tabular-nums text-money-claro md:text-6xl">
        R$ 8.400,00
      </p>
      <p className="mt-2 text-sm text-escuro-texto">
        em 6 dias <span className="text-white/40">· 10 de setembro</span>
      </p>
    </div>
  )
}

const PARCELAS = [
  { cliente: 'Ana Ribeiro', data: '10/09/2026', valor: 'R$ 3.100,00', caiu: true },
  { cliente: 'Rogério Pinto', data: '10/09/2026', valor: 'R$ 2.400,00', caiu: false },
  { cliente: 'Bruna Castro', data: '10/10/2026', valor: 'R$ 2.900,00', caiu: false },
]

/** A agenda: cada venda vira parcelas com data. */
export function AmostraRecebimentos() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="border-b px-4 py-3">
        <p className="text-sm font-medium text-muted-foreground">Próximos recebimentos</p>
      </div>
      <ul className="divide-y">
        {PARCELAS.map(p => (
          <li key={p.cliente} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{p.cliente}</p>
              <p className="text-xs text-muted-foreground">Parcela 1 de 2 · {p.data}</p>
            </div>
            {/* o dinheiro é o protagonista do cartão: maior que o resto */}
            <span className={`shrink-0 text-lg font-bold tabular-nums ${p.caiu ? 'text-money' : ''}`}>
              {p.valor}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const FAIXAS = [
  { ate: 'Até R$ 500 mil', pct: '0,5%', ativa: false },
  { ate: 'Até R$ 1 milhão', pct: '0,7%', ativa: true },
  { ate: 'Acima disso', pct: '0,9%', ativa: false },
]

/** As faixas, e o ponto que a planilha erra: a faixa vale para o mês inteiro. */
export function AmostraFaixas() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="border-b px-4 py-3">
        <p className="text-sm font-medium text-muted-foreground">Faixas do escritório</p>
      </div>
      <ul className="divide-y">
        {FAIXAS.map(f => (
          <li key={f.ate}
            className={`flex items-center justify-between gap-3 px-4 py-3 ${f.ativa ? 'bg-money-soft' : ''}`}>
            <span className="text-sm">{f.ate}</span>
            <span className={`text-sm font-semibold tabular-nums ${f.ativa ? 'text-money' : 'text-muted-foreground'}`}>
              {f.pct}
            </span>
          </li>
        ))}
      </ul>
      <p className="border-t px-4 py-3 text-xs text-muted-foreground">
        Passou de R$ 500 mil no meio do mês? As vendas anteriores são recalculadas
        pela faixa nova, sem você mexer em nada.
      </p>
    </div>
  )
}

const BILHETES = [
  { premio: '1º', numero: '084621', seu: true },
  { premio: '2º', numero: '021500', seu: false },
  { premio: '3º', numero: '062794', seu: false },
  { premio: '4º', numero: '072546', seu: false },
  { premio: '5º', numero: '068807', seu: false },
]

/** A extração da Federal, com a cota do corretor marcada. */
export function AmostraLoteria() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="flex items-baseline justify-between border-b px-4 py-3">
        <p className="text-sm font-medium text-muted-foreground">Loteria Federal</p>
        <p className="text-xs text-muted-foreground">Extração 6087</p>
      </div>
      <ul className="divide-y">
        {BILHETES.map(b => (
          <li key={b.premio} className="flex items-center justify-between gap-2 px-4 py-2.5">
            <span className="text-xs text-muted-foreground">{b.premio}</span>
            <span className={`flex items-center gap-1.5 font-mono text-base font-semibold tabular-nums tracking-[0.08em] ${b.seu ? 'text-money' : ''}`}>
              {b.seu && <Sparkles size={16} className="shrink-0" />}
              {b.numero}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
