export const queryKeys = {
  config: ['config'] as const,
  dashboard: (ano: number, mes: number) => ['dashboard', ano, mes] as const,
  vendas: (busca = '') => ['vendas', busca] as const,
  venda: (id: string) => ['venda', id] as const,
  recebimentos: (mes = '', busca = '', limite = 0) =>
    ['recebimentos', mes, busca, limite] as const,
  resumoAgenda: (busca = '') => ['resumo-agenda', busca] as const,
  clientes: (busca = '') => ['clientes', busca] as const,
  painelEscritorio: (ano: number, mes: number) => ['painel-escritorio', ano, mes] as const,
  painelDoDono: (ano: number, mes: number) => ['painel-do-dono', ano, mes] as const,
  minhasMetas: (ano: number, mes: number) => ['minhas-metas', ano, mes] as const,
  equipe: ['equipe'] as const,
}
