-- =========================================================================
-- Enterprise, fases 2-4: política de comissão do escritório, metas e faixa
-- pelo acumulado da equipe.
--
-- A política do escritório é a config_financeira de sempre, com dono
-- diferente: linhas com escritorio_id em vez de corretor_id. `aplica_a`
-- distingue a geral (nula, vale para todos) da específica de um corretor.
-- Quem resolve qual config vale para quem é config_efetiva():
--
--   específica do escritório para mim  >  geral do escritório  >  a minha
--
-- A do escritório vence a própria de propósito: é o escritório que paga a
-- assinatura e define como paga a equipe — se o corretor pudesse se sobrepor,
-- a política não valeria nada.
-- =========================================================================

-- ---------- config_financeira ganha o segundo dono ----------

alter table config_financeira alter column corretor_id drop not null;
alter table config_financeira
  add column escritorio_id uuid references escritorios(id),
  add column aplica_a uuid references profiles(id),
  -- fase 4: a faixa é achada pelo acumulado do ESCRITÓRIO no mês, não só do
  -- corretor. Só faz sentido em política de escritório.
  add column faixa_por_escritorio boolean not null default false;

-- ou é pessoal (corretor_id) ou é do escritório (escritorio_id) — nunca os dois
alter table config_financeira add constraint config_um_dono check (
  (corretor_id is not null and escritorio_id is null and aplica_a is null)
  or (escritorio_id is not null and corretor_id is null)
);

-- uma ativa por escopo, no mesmo espírito do índice pessoal `uma_config_ativa`
create unique index uma_config_geral_ativa on config_financeira (escritorio_id)
  where ativa and escritorio_id is not null and aplica_a is null;
create unique index uma_config_especifica_ativa on config_financeira (escritorio_id, aplica_a)
  where ativa and aplica_a is not null;

-- o dono gerencia as políticas do escritório dele; a policy "own rows"
-- existente continua cuidando das pessoais (corretor_id nulo nunca passa nela)
create policy "dono gerencia politicas" on config_financeira for all
  using (escritorio_id = meu_escritorio_como_dono())
  with check (escritorio_id = meu_escritorio_como_dono());

-- ---------- auditoria: linha sem corretor não explode o trigger ----------
-- registrar_evento deriva o dono de new.corretor_id; nas políticas de
-- escritório ele é nulo e o insert em eventos (not null) abortaria o save.
-- O rastro dessas linhas são as próprias versões (ativa=false empilhadas).

create or replace function registrar_evento() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_corretor uuid;
  v_acao text;
begin
  if tg_op = 'INSERT' then
    v_corretor := new.corretor_id; v_acao := 'criou';
  elsif tg_op = 'UPDATE' then
    v_corretor := new.corretor_id; v_acao := 'alterou';
  else
    v_corretor := old.corretor_id; v_acao := 'removeu';
  end if;

  -- linha institucional (política de escritório): fica fora do feed pessoal
  if v_corretor is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'UPDATE' and to_jsonb(old) - 'updated_at' = to_jsonb(new) - 'updated_at' then
    return new;
  end if;

  insert into eventos (corretor_id, entidade, entidade_id, acao, antes, depois)
  values (
    v_corretor, tg_table_name,
    case when tg_op = 'DELETE' then old.id else new.id end,
    v_acao,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );
  return case when tg_op = 'DELETE' then old else new end;
end $$;

-- ---------- competências lembram com o que foram calculadas ----------
-- É o que permite a reconciliação preguiçosa: o membro não tem como ser
-- recalculado pelo dono (RLS, auth.uid()), então quem detecta que a política
-- ou o volume da equipe mudou é o próprio app do membro, na próxima abertura,
-- comparando o que está gravado aqui com o estado atual.

alter table competencias
  add column config_aplicada uuid references config_financeira(id),
  add column volume_externo_aplicado bigint not null default 0;

-- ---------- resolução da config ----------

create or replace function config_efetiva() returns setof config_financeira
language sql stable security definer set search_path = public as $$
  with vinculo as (
    select escritorio_id from membros_escritorio
    where corretor_id = auth.uid() and saiu_em is null
  )
  select c.* from config_financeira c
  where c.ativa and (
    (c.escritorio_id in (select escritorio_id from vinculo) and c.aplica_a = auth.uid())
    or (c.escritorio_id in (select escritorio_id from vinculo) and c.aplica_a is null)
    or (c.corretor_id = auth.uid())
  )
  order by case
    when c.aplica_a = auth.uid() then 0
    when c.escritorio_id is not null then 1
    else 2
  end
  limit 1
$$;

-- ---------- volume da equipe (fase 4) ----------
-- O que os OUTROS membros venderam na competência: o engine soma o volume
-- próprio por fora. Mesmo corte temporal das policies do dono — venda fora do
-- período do vínculo não conta para a faixa de ninguém.
-- Definer de propósito: o membro não enxerga as vendas dos colegas, mas a
-- faixa dele depende do total — e o total agregado é o que a função devolve,
-- nunca as vendas.

create or replace function volume_do_escritorio(p_ano int, p_mes int) returns bigint
language sql stable security definer set search_path = public as $$
  select coalesce(sum(v.valor_carta_centavos), 0)
  from membros_escritorio meu
  join membros_escritorio m on m.escritorio_id = meu.escritorio_id
  join vendas v on v.corretor_id = m.corretor_id
  join competencias c on c.id = v.competencia_id and c.ano = p_ano and c.mes = p_mes
  where meu.corretor_id = auth.uid() and meu.saiu_em is null
    and v.status = 'confirmada'
    and v.corretor_id <> auth.uid()
    and v.data_venda >= (m.entrou_em at time zone 'America/Sao_Paulo')::date
    and (m.saiu_em is null
         or v.data_venda < (m.saiu_em at time zone 'America/Sao_Paulo')::date)
$$;

-- ---------- metas (fase 3) ----------

create table metas_escritorio (
  id uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorios(id),
  -- nulo = meta da casa, do escritório inteiro
  corretor_id uuid references profiles(id),
  ano int not null,
  mes int not null check (mes between 1 and 12),
  valor_centavos bigint not null check (valor_centavos >= 0),
  criado_em timestamptz not null default now(),
  -- nulls not distinct: sem isso o Postgres aceitaria duas metas da casa para
  -- o mesmo mês, porque null nunca é igual a null em unique comum
  unique nulls not distinct (escritorio_id, corretor_id, ano, mes)
);

alter table metas_escritorio enable row level security;

create policy "dono gerencia metas" on metas_escritorio for all
  using (escritorio_id = meu_escritorio_como_dono())
  with check (escritorio_id = meu_escritorio_como_dono());
-- o corretor vê a própria meta (a tela dele pode mostrá-la um dia)
create policy "membro ve a sua" on metas_escritorio for select
  using (corretor_id = auth.uid());

revoke all on metas_escritorio from anon, authenticated;
grant select, insert, update, delete on metas_escritorio to authenticated;

-- ---------- painel do dono, agora com metas ----------

create or replace function painel_escritorio(p_ano int, p_mes int) returns jsonb
language plpgsql stable security invoker set search_path = public as $$
declare v_resultado jsonb; v_escritorio uuid;
begin
  v_escritorio := meu_escritorio_como_dono();
  if v_escritorio is null then raise exception 'nao_e_dono'; end if;

  with producao as (
    select v.corretor_id, v.administradora, nullif(v.produto, '') as produto,
           v.valor_carta_centavos, coalesce(co.valor_centavos, 0) as comissao_centavos
    from vendas v
    join competencias c on c.id = v.competencia_id and c.ano = p_ano and c.mes = p_mes
    left join comissoes co on co.venda_id = v.id
    where v.status = 'confirmada'
  ),
  nomes as (
    select distinct on (corretor_id) corretor_id, nome, papel, saiu_em
    from membros_do_escritorio()
    order by corretor_id, entrou_em desc
  ),
  metas as (
    select corretor_id, valor_centavos from metas_escritorio
    where escritorio_id = v_escritorio and ano = p_ano and mes = p_mes
  )
  select jsonb_build_object(
    'total', (select jsonb_build_object(
      'nVendas', count(*),
      'totalCentavos', coalesce(sum(valor_carta_centavos), 0),
      'comissaoCentavos', coalesce(sum(comissao_centavos), 0)) from producao),
    'metaCasaCentavos', (select valor_centavos from metas where corretor_id is null),
    'porCorretor', coalesce((
      select jsonb_agg(linha order by (linha->>'totalCentavos')::bigint desc)
      from (
        select jsonb_build_object(
          'corretorId', n.corretor_id, 'nome', n.nome, 'papel', n.papel,
          'ativo', n.saiu_em is null,
          'nVendas', count(p.corretor_id),
          'totalCentavos', coalesce(sum(p.valor_carta_centavos), 0),
          'comissaoCentavos', coalesce(sum(p.comissao_centavos), 0),
          'metaCentavos', (select valor_centavos from metas mt where mt.corretor_id = n.corretor_id)) as linha
        from nomes n
        left join producao p on p.corretor_id = n.corretor_id
        group by n.corretor_id, n.nome, n.papel, n.saiu_em
      ) t), '[]'::jsonb),
    'porAdministradora', coalesce((
      select jsonb_agg(linha order by (linha->>'totalCentavos')::bigint desc)
      from (
        select jsonb_build_object('administradora', administradora,
          'nVendas', count(*), 'totalCentavos', sum(valor_carta_centavos)) as linha
        from producao group by administradora
      ) t), '[]'::jsonb),
    'porProduto', coalesce((
      select jsonb_agg(linha order by (linha->>'totalCentavos')::bigint desc)
      from (
        select jsonb_build_object('produto', coalesce(produto, ''),
          'nVendas', count(*), 'totalCentavos', sum(valor_carta_centavos)) as linha
        from producao group by produto
      ) t), '[]'::jsonb)
  ) into v_resultado;
  return v_resultado;
end $$;

-- ---------- grants ----------

revoke execute on function config_efetiva() from anon, public;
revoke execute on function volume_do_escritorio(int, int) from anon, public;
grant execute on function config_efetiva(), volume_do_escritorio(int, int) to authenticated;
