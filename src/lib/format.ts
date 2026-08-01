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

/** Percentual com no máximo uma vírgula decimal. */
export function mascaraPercentual(txt: string): string {
  const limpo = txt.replace(/\./g, ',').replace(/[^\d,]/g, '')
  const [inteiro, ...resto] = limpo.split(',')
  return resto.length ? `${inteiro},${resto.join('')}` : inteiro
}

export function mascaraInteiro(txt: string): string {
  return txt.replace(/\D/g, '')
}
