export const queryKeys = {
  config: ['config'] as const,
  dashboard: (ano: number, mes: number) => ['dashboard', ano, mes] as const,
  vendas: (busca = '') => ['vendas', busca] as const,
  venda: (id: string) => ['venda', id] as const,
  recebimentos: ['recebimentos'] as const,
  clientes: (busca = '') => ['clientes', busca] as const,
}
