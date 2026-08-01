import { Sparkles } from 'lucide-react'

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
    <div className="mx-auto w-[290px] rounded-[2.6rem] border border-white/15 bg-[#0A1512] p-2.5 shadow-2xl shadow-black/50 md:w-[320px]">
      <div className="overflow-hidden rounded-[2.1rem] bg-background">
        {/* barra do app */}
        <div className="flex items-center justify-between border-b bg-card px-4 pb-2.5 pt-4">
          <span className="text-sm font-semibold">ConsorPro</span>
          <span className="text-xs text-muted-foreground">●●</span>
        </div>

        {/* hero: o número que ele abre o app para ver */}
        <div className="bg-escuro px-4 pb-5 pt-4 text-white">
          <p className="text-[0.7rem] text-escuro-texto">
            Olá, <span className="font-semibold text-white">Marcos</span> 👋
          </p>
          <p className="mt-3 text-[0.7rem] text-escuro-texto">Você receberá</p>
          <p className="mt-0.5 text-[2rem] font-bold leading-none tracking-tight tabular-nums text-money-claro">
            R$ 8.400,00
          </p>
          <p className="mt-1.5 text-[0.65rem] text-escuro-texto">
            em 6 dias <span className="text-white/40">· 10 de setembro</span>
          </p>
          <div className="mt-4 rounded-lg bg-money-claro py-2 text-center text-xs font-medium text-[#06291F]">
            + Nova venda
          </div>
        </div>

        {/* números do mês e o sorteio, lado a lado como no produto */}
        <div className="grid grid-cols-2 gap-3 p-4">
          <div className="space-y-2">
            <p className="text-[0.6rem] text-muted-foreground">Setembro em números</p>
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
              {BILHETES.slice(0, 4).map(b => (
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
      </div>
    </div>
  )
}

/** O bloco escuro que abre o painel: quanto e quando. */
export function AmostraPainel() {
  return (
    <div className="rounded-3xl bg-escuro p-6 text-white shadow-2xl shadow-black/20 md:p-8">
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
export function AmostraAgenda() {
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
            <span className={`shrink-0 text-sm font-semibold tabular-nums ${p.caiu ? 'text-money' : ''}`}>
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
