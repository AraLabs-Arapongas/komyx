-- =========================================================================
-- O plano passa a ter tamanho: R$ 300/mês para até 10 corretores.
--
-- Preço com limite que nada verifica é preço de brochura: o dono convidaria
-- os quinze da equipe e o produto entregaria os quinze. O limite mora na
-- linha do escritório, e não numa constante do código, porque quem vende
-- pode combinar outro número — subir o teto de um cliente é um update, não
-- um deploy.
--
-- O DONO NÃO OCUPA VAGA. Ele é membro (papel 'dono') para que
-- `meu_escritorio()` o encontre, mas quem se conta aqui são os corretores.
-- Um escritório de dez corretores comprando um plano de dez tem que caber
-- nele; explicar que na verdade cabem nove é perder a venda no detalhe.
-- =========================================================================

alter table escritorios
  add column limite_corretores int not null default 10
  check (limite_corretores >= 0);

/*
 * Quantas vagas já estão comprometidas: corretores ativos + convites que
 * ainda podem virar corretor.
 *
 * Os convites pendentes contam de propósito. Sem isso o dono dispara quinze
 * links, os dez primeiros entram e os cinco últimos descobrem o limite ao
 * clicar — o erro cai em quem não tem como resolvê-lo.
 */
create or replace function vagas_ocupadas(p_escritorio uuid) returns int
language sql stable security definer set search_path = public as $$
  select (
    select count(*) from membros_escritorio
    where escritorio_id = p_escritorio and saiu_em is null and papel = 'corretor'
  )::int + (
    select count(*) from convites_escritorio
    where escritorio_id = p_escritorio and status = 'pendente' and expira_em > now()
  )::int
$$;

revoke execute on function vagas_ocupadas(uuid) from anon, public;
grant execute on function vagas_ocupadas(uuid) to authenticated;

-- ---------- a trava no convite ----------
/*
 * Trigger, e não checagem na action: convite é insert direto do PostgREST
 * (policy + grant de coluna), sem RPC no meio onde a regra caberia. Uma
 * validação só no TypeScript seria contornável por quem chamasse a API.
 */
create or replace function convite_cabe_no_plano() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_limite int;
begin
  select limite_corretores into v_limite from escritorios where id = new.escritorio_id;
  if vagas_ocupadas(new.escritorio_id) >= v_limite then
    raise exception 'limite_de_corretores';
  end if;
  return new;
end $$;

create trigger convite_cabe_no_plano
  before insert on convites_escritorio
  for each row execute function convite_cabe_no_plano();

-- ---------- e a trava no aceite ----------
/*
 * De novo no aceite porque o convite pode ter sido criado quando havia vaga
 * e ser clicado depois de ela sumir — o link vale catorze dias, e nesse tempo
 * outra pessoa entra. Aqui a contagem é só de membros: o convite sendo aceito
 * já está no total de `vagas_ocupadas` e se contaria duas vezes.
 */
create or replace function aceitar_convite(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_convite convites_escritorio; v_vinculo uuid; v_limite int;
begin
  if auth.uid() is null then raise exception 'sem_sessao'; end if;
  -- busca por token SEM filtrar status: quem já aceitou e clica de novo no
  -- link precisa cair no ramo idempotente abaixo, não em "convite inválido"
  select * into v_convite from convites_escritorio
    where token = p_token for update;
  if not found then raise exception 'convite_invalido'; end if;

  select escritorio_id into v_vinculo from membros_escritorio
    where corretor_id = auth.uid() and saiu_em is null;
  if v_vinculo = v_convite.escritorio_id then
    -- já está no escritório deste convite: não é erro, é o segundo clique
    return jsonb_build_object('ok', true, 'ja_era_membro', true);
  end if;

  if v_convite.status <> 'pendente' or v_convite.expira_em <= now() then
    raise exception 'convite_invalido';
  end if;
  if v_vinculo is not null
     or exists (select 1 from escritorios where dono_id = auth.uid()) then
    raise exception 'ja_tem_escritorio';
  end if;

  select limite_corretores into v_limite from escritorios
    where id = v_convite.escritorio_id;
  if (select count(*) from membros_escritorio
      where escritorio_id = v_convite.escritorio_id
        and saiu_em is null and papel = 'corretor') >= v_limite then
    raise exception 'limite_de_corretores';
  end if;

  insert into membros_escritorio (escritorio_id, corretor_id, papel)
    values (v_convite.escritorio_id, auth.uid(), 'corretor');
  update convites_escritorio set status = 'aceito', aceito_por = auth.uid(),
    aceito_em = now() where id = v_convite.id;
  return jsonb_build_object('ok', true);
end $$;

-- ---------- o admin escolhe o tamanho na criação ----------

create or replace function criar_escritorio_para(
  p_email text, p_nome text, p_meses int default 1, p_corretores int default 10)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_dono uuid; v_id uuid;
begin
  select id into v_dono from auth.users where lower(email) = lower(trim(p_email));
  if v_dono is null then raise exception 'conta_nao_encontrada: %', p_email; end if;
  if coalesce(trim(p_nome), '') = '' then raise exception 'nome_obrigatorio'; end if;
  if exists (select 1 from escritorios where dono_id = v_dono)
     or exists (select 1 from membros_escritorio
                where corretor_id = v_dono and saiu_em is null) then
    raise exception 'ja_tem_escritorio';
  end if;

  insert into escritorios (nome, dono_id, assinatura_status, assinatura_ate, limite_corretores)
  values (trim(p_nome), v_dono, 'ativa',
          -- três dias de folga sobre o mês pago: a renovação atrasa e ninguém
          -- perde o painel por causa de um boleto que compensou no dia 2
          now() + (p_meses || ' months')::interval + interval '3 days',
          p_corretores)
  returning id into v_id;

  insert into membros_escritorio (escritorio_id, corretor_id, papel)
  values (v_id, v_dono, 'dono');

  return v_id;
end $$;

revoke execute on function criar_escritorio_para(text, text, int, int)
  from anon, authenticated, public;

-- a assinatura antiga, de três argumentos, sai de cena para não ficarem duas
drop function if exists criar_escritorio_para(text, text, int);

-- ---------- o painel do dono passa a saber quantas vagas restam ----------

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
    -- o plano contratado, para a tela de equipe dizer quantas vagas sobraram
    'limiteCorretores', (select limite_corretores from escritorios where id = v_escritorio),
    'vagasOcupadas', vagas_ocupadas(v_escritorio),

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
