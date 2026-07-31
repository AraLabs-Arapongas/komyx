import type { CompetenciaRef } from '@/lib/domain/types'

// Datas como strings YYYY-MM-DD; nunca Date com timezone.
function parseISO(d: string): { ano: number; mes: number; dia: number } {
  const [ano, mes, dia] = d.split('-').map(Number)
  return { ano, mes, dia }
}

function diasNoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate()
}

export function competenciaDaVenda(dataVenda: string, diaFechamento: number): CompetenciaRef {
  const { ano, mes, dia } = parseISO(dataVenda)
  if (dia <= diaFechamento) return { ano, mes }
  return proximaCompetencia({ ano, mes })
}

export function proximaCompetencia(c: CompetenciaRef): CompetenciaRef {
  return c.mes === 12 ? { ano: c.ano + 1, mes: 1 } : { ano: c.ano, mes: c.mes + 1 }
}

export function compararCompetencias(a: CompetenciaRef, b: CompetenciaRef): number {
  return a.ano * 12 + a.mes - (b.ano * 12 + b.mes)
}

export function dataParcela(comp: CompetenciaRef, diaPagamento: number, numeroParcela: number): string {
  let { ano, mes } = comp
  for (let i = 0; i < numeroParcela; i++) ({ ano, mes } = proximaCompetencia({ ano, mes }))
  const dia = Math.min(diaPagamento, diasNoMes(ano, mes))
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}
