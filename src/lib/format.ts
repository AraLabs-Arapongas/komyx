const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

export function formatBRL(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
export function formatData(iso: string): string {
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}
export function parseBRLParaCentavos(txt: string): number {
  const limpo = txt.replace(/[^\d,]/g, '').replace(',', '.')
  return Math.round(parseFloat(limpo || '0') * 100)
}
export function formatPercentual(p: number): string {
  return String(p).replace('.', ',') + '%'
}

/** "10 de agosto" — ou "10 de agosto de 2026" com `comAno`. */
export function formatDataExtenso(iso: string, comAno = false): string {
  const [a, m, d] = iso.split('-')
  const base = `${Number(d)} de ${MESES[Number(m) - 1]}`
  return comAno ? `${base} de ${a}` : base
}

/**
 * Instante (timestamptz do banco, ISO com fuso) → dia no fuso de Brasília, no
 * formato 'YYYY-MM-DD' que o resto do sistema usa para data.
 *
 * O 'sv-SE' não é gosto: é a única localidade que o Intl formata exatamente
 * como ISO, e formatar já resolve o fuso — converter na mão erraria o dia toda
 * madrugada, quando UTC já virou e São Paulo não.
 */
export function diaDoInstante(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}

/** "Agosto de 2026". */
export function formatMesAno(ano: number, mes: number): string {
  const nome = MESES[mes - 1]
  return `${nome[0].toUpperCase()}${nome.slice(1)} de ${ano}`
}

/**
 * Máscara de moeda: o usuário digita apenas dígitos e o valor se monta da
 * direita para a esquerda, a partir dos centavos.
 */
export function mascaraValor(txt: string): string {
  const digitos = txt.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
  if (!digitos) return ''
  const centavos = digitos.padStart(3, '0')
  const reais = centavos.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${reais},${centavos.slice(-2)}`
}

/** Máscara de data DD/MM/AAAA, inserindo as barras conforme se digita. */
export function mascaraData(txt: string): string {
  const d = txt.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}

/** Converte DD/MM/AAAA em YYYY-MM-DD. Retorna '' se a data não existir. */
export function dataBRParaISO(txt: string): string {
  const m = txt.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return ''
  const [, dd, mm, aaaa] = m
  const dia = Number(dd), mes = Number(mm), ano = Number(aaaa)
  if (mes < 1 || mes > 12 || dia < 1) return ''
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate()
  if (dia > ultimoDia) return ''
  return `${aaaa}-${mm}-${dd}`
}

/**
 * Percentual com duas casas decimais, montado da direita como o campo de
 * valor. Teto de 100%: comissão de consórcio vive na casa do 0,5% e um
 * número solto digitado sem querer não pode virar regra de cálculo.
 */
export function mascaraPercentual(txt: string): string {
  const digitos = txt.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
  if (!digitos) return ''
  const centesimos = digitos.padStart(3, '0')
  const inteiro = centesimos.slice(0, -2)
  const decimais = centesimos.slice(-2)
  if (Number(`${inteiro}.${decimais}`) > 100) return '100,00'
  return `${inteiro},${decimais}`
}

export function mascaraInteiro(txt: string): string {
  return txt.replace(/\D/g, '')
}

/**
 * Hora do compromisso: HH:MM, com os dois pontos aparecendo sozinhos.
 *
 * Corrige na digitação em vez de reclamar depois — "9" vira "09" ao completar,
 * e quem digita 75 nos minutos vê 59. Um campo de hora que aceita 99:99 e só
 * acusa no salvar faz a pessoa voltar dois passos para consertar um dígito.
 */
export function mascaraHora(txt: string): string {
  const d = txt.replace(/\D/g, '').slice(0, 4)
  if (d.length <= 2) return d
  const h = Math.min(23, parseInt(d.slice(0, 2), 10))
  const m = Math.min(59, parseInt(d.slice(2), 10) || 0)
  const mm = d.length === 3 ? d.slice(2) : String(m).padStart(2, '0')
  return `${String(h).padStart(2, '0')}:${mm}`
}

/** "14:30" a partir de "14:30:00" — o Postgres devolve os segundos. */
export function horaCurta(hora: string | null): string {
  return hora ? hora.slice(0, 5) : ''
}

/**
 * Como a venda aparece quando ainda não tem cliente — o corretor registrou na
 * pressa e vai nomear depois (migration 0013). Sem isto a linha da lista sai
 * com um espaço em branco no lugar do nome, que parece defeito.
 */
export function rotuloCliente(nome: string | null | undefined): string {
  return nome?.trim() || 'Sem cliente'
}

/**
 * Porcentagem digitada direto: "40" é quarenta por cento, não quarenta
 * centésimos.
 *
 * Diferente de `mascaraPercentual`, que monta o número a partir dos centésimos
 * porque serve para comissão — onde 0,5% é comum e digitar "05" tem que virar
 * 0,05. Aqui o corretor digita a fatia da parcela, que anda de dez em dez.
 */
export function mascaraPorcentagem(txt: string): string {
  const limpo = txt.replace(/[^\d,]/g, '').replace(/,+/g, ',')
  const [inteiro, ...resto] = limpo.split(',')
  const decimais = resto.join('').slice(0, 2)
  const semZeroAEsquerda = inteiro.replace(/^0+(?=\d)/, '')
  if (Number(semZeroAEsquerda || '0') > 100) return '100'
  return resto.length > 0 ? `${semZeroAEsquerda || '0'},${decimais}` : semZeroAEsquerda
}
