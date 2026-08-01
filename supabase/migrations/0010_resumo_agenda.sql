-- A agenda financeira carregava todas as parcelas de uma vez para somar os
-- totais e descobrir quais meses têm movimento. Isso cresce a cada ano de uso:
-- um corretor com cinco anos de histórico baixava milhares de linhas (com nome
-- do cliente junto) só para mostrar as primeiras da tela.
--
-- Esta função devolve os dois números do topo e a lista de meses sem trafegar
-- as linhas. A listagem em si passa a ser paginada.
--
-- security invoker: as políticas de RLS continuam valendo, o corretor só soma o
-- que é dele.
create or replace function resumo_agenda(p_hoje date, p_busca text default '')
returns jsonb language sql security invoker stable as $$
  with visiveis as (
    select r.valor_centavos, r.data_prevista, r.status,
           -- o escritório paga no dia combinado: a parcela conta como recebida
           -- assim que a data chega. Mesma regra do cliente (jaCaiu).
           (r.status not in ('cancelado', 'estornado')
            and (r.status = 'recebido' or r.data_prevista <= p_hoje)) as ja_caiu
    from recebimentos r
    join comissoes c on c.id = r.comissao_id
    join vendas v on v.id = c.venda_id
    left join clientes cl on cl.id = v.cliente_id
    where r.corretor_id = auth.uid()
      and (coalesce(p_busca, '') = '' or cl.nome ilike '%' || p_busca || '%')
  )
  select jsonb_build_object(
    'aReceberCentavos', coalesce(sum(valor_centavos)
      filter (where not ja_caiu and status = 'previsto'), 0),
    'recebidoCentavos', coalesce(sum(valor_centavos) filter (where ja_caiu), 0),
    'total', count(*),
    'meses', coalesce(
      (select jsonb_agg(m order by m)
       from (select distinct to_char(data_prevista, 'YYYY-MM') as m from visiveis) x),
      '[]'::jsonb)
  )
  from visiveis
$$;
