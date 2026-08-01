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
