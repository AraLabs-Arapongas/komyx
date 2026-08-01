/**
 * Confere cotas contra os bilhetes da Loteria Federal.
 *
 * ATENÇÃO ao que esta função NÃO faz: ela não decide contemplação.
 *
 * Cada administradora tem sua própria regra de sorteio, e a regra vale por
 * grupo: quantos dígitos ler, de quais prêmios, o que fazer quando o número
 * sorteado não corresponde a nenhuma cota do grupo (aproximar para cima, para
 * baixo, passar ao próximo prêmio). Nada disso está cadastrado no Komyx.
 *
 * O que fazemos é a leitura mais comum — os últimos dígitos do bilhete
 * comparados com o número da cota — para o corretor saber que vale a pena
 * conferir no site da administradora. É um alerta de "olha isso", nunca um
 * "seu cliente foi contemplado".
 */

/** Só os dígitos, sem zeros à esquerda. `null` quando não sobra número algum. */
export function normalizarCota(cota: string): string | null {
  const digitos = (cota ?? '').replace(/\D/g, '').replace(/^0+/, '')
  return digitos === '' ? null : digitos
}

export type AcertoSorteio = {
  /** 1 a 5, na ordem dos prêmios da extração */
  premio: number
  bilhete: string
  /** os dígitos do bilhete que coincidiram com a cota */
  final: string
}

/**
 * Compara a cota com o final de cada bilhete, lendo tantos dígitos quanto a
 * cota tem. Cota 621 olha os três últimos; cota 21, os dois últimos.
 *
 * Cotas com mais de 6 dígitos nunca acertam: o bilhete só tem seis. Isso é
 * correto — não é cota de consórcio, é outra coisa digitada no campo.
 */
export function conferirCota(cota: string, bilhetes: string[]): AcertoSorteio[] {
  const numero = normalizarCota(cota)
  if (!numero || numero.length > 6) return []

  const acertos: AcertoSorteio[] = []
  bilhetes.forEach((bilhete, i) => {
    const digitos = bilhete.replace(/\D/g, '')
    if (digitos.length < numero.length) return
    const final = digitos.slice(-numero.length)
    // como número: o final "07" e a cota "7" são o mesmo sete
    if (Number(final) === Number(numero)) {
      acertos.push({ premio: i + 1, bilhete: digitos, final })
    }
  })
  return acertos
}
