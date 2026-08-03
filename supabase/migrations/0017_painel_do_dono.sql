-- =========================================================================
-- O painel do dono responde a pergunta de quem coordena, não a de quem vende.
--
-- O painel_escritorio original dizia "quanto a equipe vendeu neste mês". Um
-- dono abre o app para saber quem está produzindo, quem parou, se o mês vai
-- fechar na meta e quanto de comissão sai daqui a 90 dias. Nada disso cabe em
-- consulta do navegador: é histórico de vários meses, cruzado com metas e com
-- a agenda de recebimentos da equipe inteira.
--
-- Uma chamada devolve a tela toda. O que estas funções somam já é agregado —
-- nunca a venda de um membro, sempre o total dele.
-- =========================================================================

-- ---------- histórico do escritório ----------
-- Definer: o dono já lê as vendas dos membros pela policy, mas os gráficos
-- precisam de meses anteriores ao vínculo de cada um e a contagem tem que
-- bater com o corte temporal. Concentrar a regra aqui evita que o gráfico e o
-- painel discordem sobre o mesmo mês.

create or replace function historico_escritorio(p_meses int default 6)
returns table (ano int, mes int, corretor_id uuid, total_centavos bigint,
               comissao_centavos bigint, n_vendas bigint)
language sql stable security definer set search_path = public as $$
  with meu as (select id from escritorios where dono_id = auth.uid()),
  -- os meses da janela, do mais antigo ao atual, para o gráfico ter coluna
  -- zerada em vez de buraco quando ninguém vendeu
  janela as (
    select extract(year from d)::int as ano, extract(month from d)::int as mes
    from generate_series(
      date_trunc('month', (now() at time zone 'America/Sao_Paulo')) - make_interval(months => p_meses - 1),
      date_trunc('month', (now() at time zone 'America/Sao_Paulo')),
      interval '1 month') d
  )
  select j.ano, j.mes, m.corretor_id,
         coalesce(sum(v.valor_carta_centavos), 0)::bigint,
         coalesce(sum(co.valor_centavos), 0)::bigint,
         count(v.id)::bigint
  from janela j
  cross join membros_escritorio m
  left join competencias c on c.corretor_id = m.corretor_id and c.ano = j.ano and c.mes = j.mes
  left join vendas v on v.competencia_id = c.id and v.status = 'confirmada'
    and v.data_venda >= (m.entrou_em at time zone 'America/Sao_Paulo')::date
    and (m.saiu_em is null
         or v.data_venda < (m.saiu_em at time zone 'America/Sao_Paulo')::date)
  left join comissoes co on co.venda_id = v.id
  where m.escritorio_id = (select id from meu)
  group by j.ano, j.mes, m.corretor_id
  order by j.ano, j.mes
$$;

-- ---------- o painel inteiro numa chamada ----------

create or replace function painel_do_dono(p_ano int, p_mes int, p_meses_historico int default 6)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_resultado jsonb;
  v_escritorio uuid;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  v_escritorio := meu_escritorio_como_dono();
  if v_escritorio is null then raise exception 'nao_e_dono'; end if;

  with hist as (select * from historico_escritorio(p_meses_historico)),
  -- último vínculo de cada pessoa: quem saiu e voltou aparece uma vez só
  nomes as (
    select distinct on (corretor_id) corretor_id, nome, papel, saiu_em
    from membros_do_escritorio()
    order by corretor_id, entrou_em desc
  ),
  metas as (
    select corretor_id, valor_centavos from metas_escritorio
    where escritorio_id = v_escritorio and ano = p_ano and mes = p_mes
  ),
  mes as (select * from hist where ano = p_ano and mes = p_mes),
  -- o mês anterior ao escolhido, para a variação
  anterior as (
    select * from hist
    where (ano, mes) = (case when p_mes = 1 then (p_ano - 1, 12) else (p_ano, p_mes - 1) end)
  ),
  -- vendas da equipe com data e cliente: o feed e o "parou de vender"
  vendas_equipe as (
    select v.id, v.corretor_id, v.valor_carta_centavos, v.data_venda, v.created_at,
           v.administradora, nullif(v.produto, '') as produto, cl.nome as cliente
    from membros_escritorio m
    join vendas v on v.corretor_id = m.corretor_id and v.status = 'confirmada'
      and v.data_venda >= (m.entrou_em at time zone 'America/Sao_Paulo')::date
      and (m.saiu_em is null
           or v.data_venda < (m.saiu_em at time zone 'America/Sao_Paulo')::date)
    left join clientes cl on cl.id = v.cliente_id
    where m.escritorio_id = v_escritorio and m.saiu_em is null
  ),
  -- comissão da equipe por mês de vencimento: o fluxo de caixa que o dono
  -- nunca viu, porque a agenda de parcelas era sempre pessoal
  previsto as (
    select extract(year from r.data_prevista)::int as ano,
           extract(month from r.data_prevista)::int as mes,
           sum(r.valor_centavos)::bigint as centavos
    from membros_escritorio m
    join recebimentos r on r.corretor_id = m.corretor_id
    where m.escritorio_id = v_escritorio and m.saiu_em is null
      and r.status in ('previsto', 'recebido')
      and r.data_prevista >= v_hoje
      and r.data_prevista < v_hoje + interval '120 days'
    group by 1, 2
  ),
  -- cancelamento e estorno: comissão que já foi contada e voltou
  perdas as (
    select count(*)::bigint as n, coalesce(sum(v.valor_carta_centavos), 0)::bigint as centavos
    from membros_escritorio m
    join vendas v on v.corretor_id = m.corretor_id
    join competencias c on c.id = v.competencia_id and c.ano = p_ano and c.mes = p_mes
    where m.escritorio_id = v_escritorio
      and v.status in ('cancelada', 'estornada')
  )
  select jsonb_build_object(
    'mes', jsonb_build_object('ano', p_ano, 'mes', p_mes),
    'total', (select jsonb_build_object(
      'totalCentavos', coalesce(sum(total_centavos), 0),
      'comissaoCentavos', coalesce(sum(comissao_centavos), 0),
      'nVendas', coalesce(sum(n_vendas), 0)) from mes),
    'anterior', (select jsonb_build_object(
      'totalCentavos', coalesce(sum(total_centavos), 0),
      'comissaoCentavos', coalesce(sum(comissao_centavos), 0),
      'nVendas', coalesce(sum(n_vendas), 0)) from anterior),
    'metaCasaCentavos', (select valor_centavos from metas where corretor_id is null),
    'perdas', (select jsonb_build_object('nVendas', n, 'totalCentavos', centavos) from perdas),
    'convitesPendentes', (select count(*) from convites_escritorio
      where escritorio_id = v_escritorio and status = 'pendente' and expira_em > now()),

    'corretores', coalesce((
      select jsonb_agg(linha order by (linha->>'totalCentavos')::bigint desc)
      from (
        select jsonb_build_object(
          'corretorId', n.corretor_id, 'nome', n.nome, 'papel', n.papel,
          'ativo', n.saiu_em is null,
          'totalCentavos', coalesce(mm.total_centavos, 0),
          'comissaoCentavos', coalesce(mm.comissao_centavos, 0),
          'nVendas', coalesce(mm.n_vendas, 0),
          'anteriorCentavos', coalesce(aa.total_centavos, 0),
          'metaCentavos', (select valor_centavos from metas mt where mt.corretor_id = n.corretor_id),
          -- dias desde a última venda: o sinal mais acionável que existe sem
          -- CRM. Nulo quando a pessoa nunca vendeu.
          'diasSemVender', (select (v_hoje - max(ve.data_venda))
            from vendas_equipe ve where ve.corretor_id = n.corretor_id),
          -- média mensal do histórico, para comparar o mês com o próprio
          -- passado da pessoa em vez de com a média dos outros
          'mediaMensalCentavos', (select round(avg(h.total_centavos))::bigint
            from hist h where h.corretor_id = n.corretor_id)
        ) as linha
        from nomes n
        left join mes mm on mm.corretor_id = n.corretor_id
        left join anterior aa on aa.corretor_id = n.corretor_id
      ) t), '[]'::jsonb),

    'historico', coalesce((
      select jsonb_agg(linha order by (linha->>'ano')::int, (linha->>'mes')::int)
      from (
        select jsonb_build_object('ano', ano, 'mes', mes,
          'totalCentavos', sum(total_centavos),
          'comissaoCentavos', sum(comissao_centavos),
          'nVendas', sum(n_vendas)) as linha
        from hist group by ano, mes
      ) t), '[]'::jsonb),

    -- série por corretor, para o gráfico de quem sobe e quem cai
    'historicoPorCorretor', coalesce((
      select jsonb_agg(linha)
      from (
        select jsonb_build_object(
          'corretorId', h.corretor_id,
          'nome', (select nome from nomes n where n.corretor_id = h.corretor_id),
          'serie', jsonb_agg(jsonb_build_object('ano', h.ano, 'mes', h.mes,
            'totalCentavos', h.total_centavos) order by h.ano, h.mes)) as linha
        from hist h group by h.corretor_id
      ) t), '[]'::jsonb),

    'previsto', coalesce((
      select jsonb_agg(jsonb_build_object('ano', ano, 'mes', mes, 'centavos', centavos)
        order by ano, mes) from previsto), '[]'::jsonb),

    'porAdministradora', coalesce((
      select jsonb_agg(linha order by (linha->>'totalCentavos')::bigint desc)
      from (
        select jsonb_build_object('rotulo', ve.administradora,
          'nVendas', count(*), 'totalCentavos', sum(ve.valor_carta_centavos)) as linha
        from vendas_equipe ve
        join competencias c on c.corretor_id = ve.corretor_id and c.ano = p_ano and c.mes = p_mes
        join vendas v2 on v2.id = ve.id and v2.competencia_id = c.id
        group by ve.administradora
      ) t), '[]'::jsonb),

    'porProduto', coalesce((
      select jsonb_agg(linha order by (linha->>'totalCentavos')::bigint desc)
      from (
        select jsonb_build_object('rotulo', coalesce(ve.produto, ''),
          'nVendas', count(*), 'totalCentavos', sum(ve.valor_carta_centavos)) as linha
        from vendas_equipe ve
        join competencias c on c.corretor_id = ve.corretor_id and c.ano = p_ano and c.mes = p_mes
        join vendas v2 on v2.id = ve.id and v2.competencia_id = c.id
        group by ve.produto
      ) t), '[]'::jsonb),

    -- as últimas da equipe, sem filtro de mês: o feed é sobre "acabou de
    -- acontecer", não sobre a competência escolhida no seletor
    'ultimasVendas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'nome', (select nome from nomes n where n.corretor_id = ve.corretor_id),
        'cliente', ve.cliente, 'centavos', ve.valor_carta_centavos,
        'quando', ve.created_at) order by ve.created_at desc)
      from (select * from vendas_equipe order by created_at desc limit 8) ve), '[]'::jsonb)
  ) into v_resultado;

  return v_resultado;
end $$;

revoke execute on function historico_escritorio(int) from anon, public;
revoke execute on function painel_do_dono(int, int, int) from anon, public;
grant execute on function historico_escritorio(int), painel_do_dono(int, int, int) to authenticated;
