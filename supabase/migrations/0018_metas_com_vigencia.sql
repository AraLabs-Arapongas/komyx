-- =========================================================================
-- Meta deixa de ser cadastro mensal e passa a ter vigência.
--
-- Meta por mês, começando vazia, é trabalho eterno: o dono teria que abrir o
-- app todo dia 1º e digitar tudo de novo, e enquanto não digitasse o painel
-- ficaria sem barra, sem projeção e sem alerta. Uma tela inteira dependendo
-- de um cadastro que ninguém mantém.
--
-- Agora a meta vale de um mês em diante, até alguém salvar outra — o mesmo
-- modelo que a política de comissão já usa neste produto. Define uma vez,
-- mexe quando muda. E o histórico fica honesto: "bateu a meta em julho" usa
-- a meta que valia em julho, não a de hoje.
-- =========================================================================

alter table metas_escritorio
  -- primeiro dia do mês em que a meta passa a valer
  add column vigente_de date;

-- as metas que já existem viram vigência a partir do próprio mês delas
update metas_escritorio set vigente_de = make_date(ano, mes, 1);
alter table metas_escritorio alter column vigente_de set not null;

-- ano/mes deixam de existir: a data cobre os dois, e manter os três abriria
-- espaço para discordarem
alter table metas_escritorio drop constraint metas_escritorio_escritorio_id_corretor_id_ano_mes_key;
alter table metas_escritorio drop column ano, drop column mes;

-- uma meta por escopo e por data de início. nulls not distinct porque a meta
-- da casa tem corretor_id nulo, e null nunca é igual a null em unique comum
alter table metas_escritorio
  add constraint uma_meta_por_vigencia
  unique nulls not distinct (escritorio_id, corretor_id, vigente_de);

create index metas_por_vigencia on metas_escritorio (escritorio_id, corretor_id, vigente_de desc);

-- ---------- resolução ----------

/*
 * A meta que vale num mês: a última salva até ele.
 *
 * `distinct on` com ordem decrescente por vigência é o jeito do Postgres de
 * dizer "a mais recente de cada escopo" numa passada só.
 */
create or replace function metas_vigentes(p_escritorio uuid, p_ano int, p_mes int)
returns table (corretor_id uuid, valor_centavos bigint, vigente_de date)
language sql stable security definer set search_path = public as $$
  select distinct on (m.corretor_id) m.corretor_id, m.valor_centavos, m.vigente_de
  from metas_escritorio m
  where m.escritorio_id = p_escritorio
    and m.vigente_de <= make_date(p_ano, p_mes, 1)
  order by m.corretor_id, m.vigente_de desc
$$;

revoke execute on function metas_vigentes(uuid, int, int) from anon, public;
grant execute on function metas_vigentes(uuid, int, int) to authenticated;

-- ---------- o painel passa a herdar a meta ----------

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
  nomes as (
    select distinct on (corretor_id) corretor_id, nome, papel, saiu_em
    from membros_do_escritorio()
    order by corretor_id, entrou_em desc
  ),
  metas as (select * from metas_vigentes(v_escritorio, p_ano, p_mes)),
  mes as (select * from hist where ano = p_ano and mes = p_mes),
  anterior as (
    select * from hist
    where (ano, mes) = (case when p_mes = 1 then (p_ano - 1, 12) else (p_ano, p_mes - 1) end)
  ),
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
    -- desde quando a meta da casa vale: a tela avisa quando o mês herdou uma
    -- meta antiga, em vez de deixar parecer que alguém a definiu para ele
    'metaCasaVigenteDe', (select vigente_de from metas where corretor_id is null),
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
          'diasSemVender', (select (v_hoje - max(ve.data_venda))
            from vendas_equipe ve where ve.corretor_id = n.corretor_id),
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

    'ultimasVendas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'nome', (select nome from nomes n where n.corretor_id = ve.corretor_id),
        'cliente', ve.cliente, 'centavos', ve.valor_carta_centavos,
        'quando', ve.created_at) order by ve.created_at desc)
      from (select * from vendas_equipe order by created_at desc limit 8) ve), '[]'::jsonb)
  ) into v_resultado;

  return v_resultado;
end $$;
